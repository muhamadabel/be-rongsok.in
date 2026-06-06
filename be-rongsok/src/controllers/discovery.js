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

    const collectors = await prisma.$queryRaw`
      SELECT DISTINCT
        cp.id,
        cp."shopName",
        cp.description,
        cp."priorityScore",
        cp."isPremium",
        u.name as "ownerName",
        u."avgRating",
        u."isVerified" as "ownerVerified",
        ST_Distance(u.location, ST_SetSRID(ST_MakePoint(${parseFloat(lng)}, ${parseFloat(lat)}), 4326)::geography) as distance
      FROM "CollectorProfile" cp
      JOIN "User" u ON cp."userId" = u.id
      LEFT JOIN "CollectorCatalog" cc ON cp.id = cc."collectorId"
      WHERE
        cp."isOpen" = true
        ${categoryFilter}
        AND u.location IS NOT NULL
        AND ST_DWithin(u.location, ST_SetSRID(ST_MakePoint(${parseFloat(lng)}, ${parseFloat(lat)}), 4326)::geography, ${parseFloat(radius)} * 1000)
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
        user: { select: { id: true, name: true, phone: true, avatarUrl: true, avgRating: true, isVerified: true } },
        catalogs: { include: { category: true } }
      }
    });

    if (!collector) {
      return res.status(404).json({ status: 'error', message: 'Pengepul tidak ditemukan' });
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

module.exports = { search, getCategories, getCollectorById, getStats };
