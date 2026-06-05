const prisma = require('../config/prisma');
const { Prisma } = require('@prisma/client');

const search = async (req, res, next) => {
  try {
    const { lat, lng, categoryId, radius = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ status: 'error', message: 'lat and lng are required' });
    }

    // categoryId opsional — kalau ada, filter pengepul yang punya katalog aktif kategori itu
    const categoryFilter = categoryId
      ? Prisma.sql`AND cc."categoryId" = ${categoryId} AND cc."isActive" = true`
      : Prisma.sql``;

    const collectors = await prisma.$queryRaw`
      SELECT DISTINCT
        cp.id,
        cp."shopName",
        cp.description,
        cp."priorityScore",
        cp."isPremium",
        u.name as "ownerName",
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
    const categories = await prisma.wasteCategory.findMany();
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

    res.status(200).json({ status: 'success', data: collector });
  } catch (error) {
    next(error);
  }
};

module.exports = { search, getCategories, getCollectorById };
