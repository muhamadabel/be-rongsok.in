const prisma = require('../config/prisma');
const { z } = require('zod');

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// GET /admin/stats — KPI + grafik mingguan
const getStats = async (req, res, next) => {
  try {
    const activeStatuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION'];

    const [completedAgg, activeOrders, totalCustomers, totalCollectors] = await Promise.all([
      prisma.order.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { actualWeight: true, totalPrice: true }
      }),
      prisma.order.count({ where: { status: { in: activeStatuses } } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'COLLECTOR' } })
    ]);

    // Weekly: 7 hari terakhir, group per tanggal
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const rows = await prisma.$queryRaw`
      SELECT
        DATE("createdAt") AS date,
        COUNT(*)::int AS count,
        COALESCE(SUM("actualWeight"), 0) AS weight,
        COALESCE(SUM("totalPrice"), 0) AS amount
      FROM "Order"
      WHERE status = 'COMPLETED' AND "createdAt" >= ${since}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Bangun 7 hari penuh (isi 0 untuk hari tanpa transaksi)
    const map = {};
    rows.forEach((r) => {
      const key = new Date(r.date).toISOString().slice(0, 10);
      map[key] = r;
    });

    const weeklyTransactions = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const r = map[key];
      weeklyTransactions.push({
        day: DAY_NAMES[d.getDay()],
        date: key,
        weight: r ? Number(r.weight) : 0,
        amount: r ? Number(r.amount) : 0,
        count: r ? Number(r.count) : 0
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        totalWeightKg: Number(completedAgg._sum.actualWeight || 0),
        totalPayout: Number(completedAgg._sum.totalPrice || 0),
        activeOrders,
        totalCustomers,
        totalCollectors,
        weeklyTransactions
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /admin/orders?status=&page=&limit= — monitoring transaksi nasional
const getOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = status ? { status } : {};
    const take = Number(limit) || 20;
    const skip = (Number(page) - 1) * take;

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          collector: { select: { id: true, name: true } },
          category: true,
          items: { include: { category: true } }
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip
      }),
      prisma.order.count({ where })
    ]);

    res.status(200).json({
      status: 'success',
      data: { data, total, page: Number(page), limit: take }
    });
  } catch (error) {
    next(error);
  }
};

// ── CRUD Kategori (Data Master) ──────────────────────────────────────────
const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  iconUrl: z.string().optional(),
  parentId: z.string().nullable().optional(),       // null/undefined = kategori induk
  unit: z.enum(['kg', 'liter', 'pcs']).optional(),
  sortOrder: z.number().int().optional()
});

const createCategory = async (req, res, next) => {
  try {
    const data = categorySchema.parse(req.body);
    const cat = await prisma.wasteCategory.create({ data });
    res.status(201).json({ status: 'success', data: cat });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ status: 'error', message: 'Validation failed', errors: error.errors });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ status: 'error', message: 'Nama kategori sudah ada' });
    }
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const data = categorySchema.partial().parse(req.body);
    const cat = await prisma.wasteCategory.update({
      where: { id: req.params.id },
      data
    });
    res.status(200).json({ status: 'success', data: cat });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ status: 'error', message: 'Validation failed', errors: error.errors });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ status: 'error', message: 'Kategori tidak ditemukan' });
    }
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    // Cek apakah masih dipakai katalog / order item, atau punya sub-item (anak)
    const [inCatalog, inItem, hasChildren] = await Promise.all([
      prisma.collectorCatalog.findFirst({ where: { categoryId: req.params.id } }),
      prisma.orderItem.findFirst({ where: { categoryId: req.params.id } }),
      prisma.wasteCategory.findFirst({ where: { parentId: req.params.id } })
    ]);
    if (hasChildren) {
      return res.status(400).json({
        status: 'error',
        message: 'Kategori utama masih punya sub-item. Hapus sub-item dulu.'
      });
    }
    if (inCatalog || inItem) {
      return res.status(400).json({
        status: 'error',
        message: 'Kategori masih dipakai pengepul atau transaksi. Tidak bisa dihapus.'
      });
    }
    await prisma.wasteCategory.delete({ where: { id: req.params.id } });
    res.status(200).json({ status: 'success', data: { id: req.params.id } });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ status: 'error', message: 'Kategori tidak ditemukan' });
    }
    next(error);
  }
};

module.exports = { getStats, getOrders, createCategory, updateCategory, deleteCategory };
