const prisma = require('../config/prisma');
const { z } = require('zod');

const profileSchema = z.object({
  shopName: z.string().min(3),
  description: z.string().optional(),
  // Pengepul tak lagi punya radius layanan (jangkauan unlimited) — kolomnya masih
  // ada demi kompatibilitas data lama, tapi FE tak mengirimnya lagi.
  radiusKm: z.number().min(1).max(50).optional(),
  isOpen: z.boolean().optional(),
  shopImageUrl: z.string().optional(),
  // Jam buka (teks bebas). Informatif saja — buka/tutup tetap manual via isOpen.
  operatingHours: z.string().max(200).optional()
});

const catalogSchema = z.array(z.object({
  categoryId: z.string(),
  minPrice: z.number(),
  maxPrice: z.number(),
  isActive: z.boolean().optional()
}));

const createOrUpdateProfile = async (req, res, next) => {
  try {
    const data = profileSchema.parse(req.body);
    
    // Check if user is COLLECTOR
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user.role !== 'COLLECTOR') {
      return res.status(403).json({ status: 'error', message: 'Only collectors can manage profiles' });
    }

    const profile = await prisma.collectorProfile.upsert({
      where: { userId: req.user.id },
      update: data,
      create: { ...data, userId: req.user.id }
    });

    res.status(200).json({ status: 'success', data: profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ status: 'error', message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const updateCatalogs = async (req, res, next) => {
  try {
    const catalogs = catalogSchema.parse(req.body);
    
    const profile = await prisma.collectorProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Collector profile not found' });
    }

    // Delete existing catalogs and insert new ones
    await prisma.collectorCatalog.deleteMany({ where: { collectorId: profile.id } });
    
    const createdCatalogs = await Promise.all(catalogs.map(cat => 
      prisma.collectorCatalog.create({
        data: {
          collectorId: profile.id,
          categoryId: cat.categoryId,
          minPrice: cat.minPrice,
          maxPrice: cat.maxPrice,
          isActive: cat.isActive !== undefined ? cat.isActive : true
        }
      })
    ));

    res.status(200).json({ status: 'success', data: createdCatalogs });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ status: 'error', message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const profile = await prisma.collectorProfile.findUnique({
      where: { userId: req.user.id },
      include: { catalogs: { include: { category: true } } }
    });
    if (!profile) {
      return res.status(404).json({ status: 'error', message: 'Profile not found' });
    }
    res.status(200).json({ status: 'success', data: profile });
  } catch (error) {
    next(error);
  }
};

module.exports = { createOrUpdateProfile, updateCatalogs, getProfile };
