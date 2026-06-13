const prisma = require('../config/prisma');
const { Prisma } = require('@prisma/client');

const search = async (req, res, next) => {
  try {
    const { lat, lng, categoryId, radius = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ status: 'error', message: 'lat and lng are required' });
    }

    // categoryId opsional. Bisa berupa kategori UTAMA (induk) atau item (anak).
    // Kalau induk, cocokkan kalau pengepul punya katalog aktif untuk SALAH SATU anaknya.
    const categoryFilter = categoryId
      ? Prisma.sql`AND cc."isActive" = true AND cc."categoryId" IN (
          SELECT id FROM "WasteCategory" WHERE id = ${categoryId} OR "parentId" = ${categoryId}
        )`
      : Prisma.sql``;

    // maxPrice = harga ambil TERTINGGI pengepul (untuk sort "harga termahal" di FE).
    // Saat categoryId difilter → harga utk kategori itu; tanpa filter → harga aktif tertinggi.
    const collectors = await prisma.$queryRaw`
      SELECT
        cp.id,
        cp."shopName",
        cp.description,
        cp."shopImageUrl",
        cp."priorityScore",
        cp."isPremium",
        u.name as "ownerName",
        u."avatarUrl",
        u."avgRating",
        u."isVerified" as "ownerVerified",
        ST_Distance(u.location, ST_SetSRID(ST_MakePoint(${parseFloat(lng)}, ${parseFloat(lat)}), 4326)::geography) as distance,
        MAX(CASE WHEN cc."isActive" = true THEN cc."maxPrice" END) as "maxPrice"
      FROM "CollectorProfile" cp
      JOIN "User" u ON cp."userId" = u.id
      LEFT JOIN "CollectorCatalog" cc ON cp.id = cc."collectorId"
      WHERE
        cp."isOpen" = true
        ${categoryFilter}
        AND u.location IS NOT NULL
        AND ST_DWithin(u.location, ST_SetSRID(ST_MakePoint(${parseFloat(lng)}, ${parseFloat(lat)}), 4326)::geography, ${parseFloat(radius)} * 1000)
      GROUP BY cp.id, u.id
      ORDER BY cp."isPremium" DESC, distance ASC
    `;

    res.status(200).json({ status: 'success', data: collectors });
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    // Return flat list (sudah termasuk parentId, unit, sortOrder) — FE bangun tree-nya.
    const categories = await prisma.wasteCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.status(200).json({ status: 'success', data: categories });
  } catch (error) {
    next(error);
  }
};

// GET /discovery/collectors/:id — detail lapak (publik). Dipakai halaman /pengepul/[id] di FE.
const getCollectorById = async (req, res, next) => {
  try {
    const collector = await prisma.collectorProfile.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, phone: true, avatarUrl: true, avgRating: true } },
        catalogs: { include: { category: true } }
      }
    });

    if (!collector) {
      return res.status(404).json({ status: 'error', message: 'Pengepul tidak ditemukan' });
    }

    // Koordinat lapak (parse PostGIS User.location) — untuk peta lokasi & hitung jarak di FE.
    const coords = await prisma.$queryRaw`
      SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
      FROM "User" WHERE id = ${collector.userId} LIMIT 1
    `;
    if (coords && coords[0] && coords[0].lat != null) {
      collector.user.lat = coords[0].lat;
      collector.user.lng = coords[0].lng;
    }

    res.status(200).json({ status: 'success', data: collector });
  } catch (error) {
    next(error);
  }
};

// GET /discovery/stats — statistik publik untuk landing page (tanpa auth)
const getStats = async (req, res, next) => {
  try {
    const [totalTransactions, totalCollectors, totalCustomers, totalCategories, weightAgg] =
      await Promise.all([
        prisma.order.count({ where: { status: 'COMPLETED' } }),
        prisma.collectorProfile.count(),
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.wasteCategory.count(),
        prisma.order.aggregate({ where: { status: 'COMPLETED' }, _sum: { actualWeight: true } })
      ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalTransactions,
        totalCollectors,
        totalCustomers,
        totalCategories,
        totalWeightKg: Number(weightAgg._sum.actualWeight || 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /discovery/leaderboard — papan peringkat dampak ekologis (publik).
// Ranking customer berdasarkan total berat (kg) sampah terdaur ulang dari order COMPLETED.
// Query ?userId=<id> opsional → balikan juga peringkat & total user tsb (meski di luar Top-N).
const getLeaderboard = async (req, res, next) => {
  try {
    const { userId } = req.query;

    // Top 20 customer berdasarkan total actualWeight (order COMPLETED)
    const grouped = await prisma.order.groupBy({
      by: ['customerId'],
      where: { status: 'COMPLETED', actualWeight: { not: null } },
      _sum: { actualWeight: true },
      _count: { _all: true },
      orderBy: { _sum: { actualWeight: 'desc' } },
      take: 20
    });

    const ids = grouped.map((g) => g.customerId);
    const users = ids.length
      ? await prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, avatarUrl: true }
        })
      : [];
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));

    const leaderboard = grouped.map((g, i) => ({
      rank: i + 1,
      userId: g.customerId,
      name: byId[g.customerId]?.name || 'Pengguna',
      avatarUrl: byId[g.customerId]?.avatarUrl || null,
      totalKg: Number(g._sum.actualWeight || 0),
      orderCount: g._count._all
    }));

    let me = null;
    if (userId) {
      const mineAgg = await prisma.order.aggregate({
        where: { status: 'COMPLETED', actualWeight: { not: null }, customerId: String(userId) },
        _sum: { actualWeight: true },
        _count: { _all: true }
      });
      const myKg = Number(mineAgg._sum.actualWeight || 0);
      let rank = null;
      if (myKg > 0) {
        // Peringkat = jumlah customer dgn total LEBIH BESAR + 1
        const higher = await prisma.order.groupBy({
          by: ['customerId'],
          where: { status: 'COMPLETED', actualWeight: { not: null } },
          _sum: { actualWeight: true },
          having: { actualWeight: { _sum: { gt: myKg } } }
        });
        rank = higher.length + 1;
      }
      me = { userId: String(userId), totalKg: myKg, orderCount: mineAgg._count._all, rank };
    }

    res.status(200).json({ status: 'success', data: { leaderboard, me } });
  } catch (error) {
    next(error);
  }
};

module.exports = { search, getCategories, getCollectorById, getStats, getLeaderboard };
