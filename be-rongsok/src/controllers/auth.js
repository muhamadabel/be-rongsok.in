const prisma = require('../config/prisma');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['CUSTOMER', 'COLLECTOR']),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  addressText: z.string().max(500).optional(),
  // KYC (opsional di schema agar BE backward-compatible; divalidasi di controller)
  nik: z.string().regex(/^\d{16}$/, 'NIK harus 16 digit').optional(),
  ktpName: z.string().min(2).optional(),
  ktpUrl: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const updateMeSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  addressText: z.string().max(500).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  // KYC (opsional) — dipakai jalur verifikasi in-app /profile/verify di FE
  nik: z.string().regex(/^\d{16}$/, 'NIK harus 16 digit').optional(),
  ktpName: z.string().min(2).optional(),
  ktpUrl: z.string().optional()
});

const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return res.status(400).json({ status: 'error', message: 'Email already registered' });
    }

    // KYC anti wash-trading: 1 KTP = 1 akun = 1 role.
    // NIK adalah kunci unik utama. Nama dicek sebagai lapis tambahan (case-insensitive,
    // dibatasi ke akun yang sudah punya NIK terdaftar agar tidak false-positive nama umum).
    if (data.nik) {
      const dupNik = await prisma.user.findUnique({ where: { nik: data.nik } });
      if (dupNik) {
        return res.status(409).json({ status: 'error', message: 'Identitas sudah terdaftar.' });
      }
      const refName = (data.ktpName || data.name || '').trim();
      if (refName) {
        const dupName = await prisma.user.findFirst({
          where: {
            nik: { not: null },
            ktpName: { equals: refName, mode: 'insensitive' }
          }
        });
        if (dupName) {
          return res.status(409).json({ status: 'error', message: 'Identitas sudah terdaftar.' });
        }
      }
    }

    const hashedPassword = await hashPassword(data.password);
    // Terverifikasi begitu NIK terbaca. NIK dibaca AI dari foto KTP asli & dikunci;
    // foto KTP sengaja tidak disimpan demi privasi, jadi tak lagi syaratkan ktpUrl.
    const isKyc = Boolean(data.nik);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: hashedPassword,
        role: data.role,
        phone: data.phone,
        avatarUrl: data.avatarUrl,
        addressText: data.addressText || null,
        nik: data.nik || null,
        ktpName: data.ktpName || null,
        ktpUrl: data.ktpUrl || null,
        isVerified: isKyc
      }
    });

    const token = generateToken(user);
    res.status(201).json({
      status: 'success',
      data: {
        access_token: token,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatarUrl: user.avatarUrl, isVerified: user.isVerified }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ status: 'error', message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !(await comparePassword(data.password, user.passwordHash))) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }

    const token = generateToken(user);
    res.status(200).json({
      status: 'success',
      data: {
        access_token: token,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatarUrl: user.avatarUrl, isVerified: user.isVerified }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ status: 'error', message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    // Pakai raw query untuk parse lokasi PostGIS jadi lat/lng
    const rows = await prisma.$queryRaw`
      SELECT
        id, name, email, role, "avgRating", "avatarUrl", phone, "createdAt",
        "isVerified", nik, "ktpName", "addressText",
        ST_Y(location::geometry) AS lat,
        ST_X(location::geometry) AS lng
      FROM "User"
      WHERE id = ${req.user.id}
      LIMIT 1
    `;
    res.status(200).json({ status: 'success', data: rows[0] || null });
  } catch (error) {
    next(error);
  }
};

// PATCH /auth/me — update profil user + lokasi (dipakai customer & collector di FE)
const updateMe = async (req, res, next) => {
  try {
    const data = updateMeSchema.parse(req.body);
    const userId = req.user.id;

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.addressText !== undefined) updateData.addressText = data.addressText;

    // KYC: simpan NIK / nama-KTP / URL-KTP + tandai verified.
    // Cek duplikat identitas (anti wash-trading) sama seperti saat register,
    // tapi kecualikan akun sendiri.
    if (data.nik !== undefined) {
      const dupNik = await prisma.user.findFirst({
        where: { nik: data.nik, id: { not: userId } }
      });
      if (dupNik) {
        return res.status(409).json({ status: 'error', message: 'Identitas sudah terdaftar.' });
      }
      const refName = (data.ktpName || '').trim();
      if (refName) {
        const dupName = await prisma.user.findFirst({
          where: {
            id: { not: userId },
            nik: { not: null },
            ktpName: { equals: refName, mode: 'insensitive' }
          }
        });
        if (dupName) {
          return res.status(409).json({ status: 'error', message: 'Identitas sudah terdaftar.' });
        }
      }
      updateData.nik = data.nik;
      if (data.ktpName !== undefined) updateData.ktpName = data.ktpName;
      if (data.ktpUrl !== undefined) updateData.ktpUrl = data.ktpUrl;
      // Terverifikasi begitu NIK terbaca (konsisten dgn register; foto KTP tak disimpan)
      if (data.nik) updateData.isVerified = true;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: updateData });
    }

    // Update lokasi PostGIS (kolom Unsupported, harus raw)
    if (data.lat !== undefined && data.lng !== undefined) {
      await prisma.$executeRaw`
        UPDATE "User"
        SET location = ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326)::geography
        WHERE id = ${userId}
      `;
    }

    const rows = await prisma.$queryRaw`
      SELECT
        id, name, email, role, "avgRating", "avatarUrl", phone, "createdAt",
        "isVerified", nik, "ktpName", "addressText",
        ST_Y(location::geometry) AS lat,
        ST_X(location::geometry) AS lng
      FROM "User"
      WHERE id = ${userId}
      LIMIT 1
    `;

    res.status(200).json({ status: 'success', data: rows[0] || null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ status: 'error', message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

module.exports = { register, login, me, updateMe };
