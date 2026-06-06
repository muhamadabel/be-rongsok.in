const prisma = require('../config/prisma');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['CUSTOMER', 'COLLECTOR']),
  phone: z.string().optional(),
  avatarUrl: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const updateMeSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional()
});

const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return res.status(400).json({ status: 'error', message: 'Email already registered' });
    }

    const hashedPassword = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: hashedPassword,
        role: data.role,
        phone: data.phone,
        avatarUrl: data.avatarUrl
      }
    });

    const token = generateToken(user);
    res.status(201).json({
      status: 'success',
      data: {
        access_token: token,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatarUrl: user.avatarUrl }
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
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatarUrl: user.avatarUrl }
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
