require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// ── 6 Kategori (flat) ────────────────────────────────────────────────────
// description = daftar CONTOH isi kategori (info saja, bukan item terpisah).
// unit = satuan harga & timbang per kategori.
const CATEGORIES = [
  {
    name: 'Plastik',
    unit: 'kg',
    description: 'Botol bening, botol sabun & jerigen, gelas plastik, ember & plastik keras',
  },
  {
    name: 'Kertas & Kardus',
    unit: 'kg',
    description: 'Kardus, kertas putih/HVS, buku, koran & majalah bekas',
  },
  {
    name: 'Logam & Besi',
    unit: 'kg',
    description: 'Besi tua & seng, aluminium (kaleng/panci), kabel & tembaga',
  },
  {
    name: 'Kaca & Botol',
    unit: 'kg',
    description: 'Botol kaca utuh (kecap/sirup), pecahan kaca & beling',
  },
  {
    name: 'Elektronik',
    unit: 'pcs',
    description: 'TV/kulkas/mesin cuci rusak, HP & laptop mati, aki bekas',
  },
  {
    name: 'Lain-lain',
    unit: 'liter',
    description: 'Minyak jelantah (minyak goreng bekas)',
  },
];

async function main() {
  // Hapus data yang merujuk kategori & user (FK-safe). DB fresh, jadi aman.
  await prisma.rating.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.orderCollector.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.collectorCatalog.deleteMany();
  await prisma.collectorProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.wasteCategory.deleteMany();

  // Seed Waste Categories
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    await prisma.wasteCategory.create({
      data: {
        name: c.name,
        description: c.description,
        unit: c.unit,
        sortOrder: i,
        parentId: null,
      },
    });
  }

  // Seed Admin
  const adminHash = await bcryptHash('admin123');
  await prisma.user.create({
    data: {
      name: 'Admin Rongsok',
      email: 'admin@rongsok.in',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  // Seed Customer (Rizky)
  const customerHash = await bcryptHash('customer123');
  const customer = await prisma.user.create({
    data: {
      name: 'Rizky Customer',
      email: 'rizky@example.com',
      passwordHash: customerHash,
      role: 'CUSTOMER',
      phone: '081234567890',
      isVerified: true,
    },
  });

  // Set Customer Location (Yogyakarta)
  await prisma.$executeRaw`
    UPDATE "User"
    SET location = ST_SetSRID(ST_MakePoint(110.3695, -7.7956), 4326)::geography
    WHERE id = ${customer.id}
  `;

  // Seed Collector (Budi)
  const collectorHash = await bcryptHash('collector123');
  const collector = await prisma.user.create({
    data: {
      name: 'Budi Pengepul',
      email: 'budi@collector.com',
      passwordHash: collectorHash,
      role: 'COLLECTOR',
      phone: '089876543210',
      isVerified: true,
    },
  });

  // Set Collector Location (Yogyakarta)
  await prisma.$executeRaw`
    UPDATE "User"
    SET location = ST_SetSRID(ST_MakePoint(110.3695, -7.7956), 4326)::geography
    WHERE id = ${collector.id}
  `;

  // Seed Collector Profile
  const collectorProfile = await prisma.collectorProfile.create({
    data: {
      userId: collector.id,
      shopName: 'Lapak Budi Yogyakarta',
      description: 'Pengepul Daur Ulang Terpercaya',
      radiusKm: 25,
      isOpen: true,
    },
  });

  // Seed Collector Catalog for Budi for all categories
  const categories = await prisma.wasteCategory.findMany();
  for (const cat of categories) {
    await prisma.collectorCatalog.create({
      data: {
        collectorId: collectorProfile.id,
        categoryId: cat.id,
        minPrice: 1000,
        maxPrice: 5000,
        isActive: true,
      },
    });
  }

  const totalCategories = await prisma.wasteCategory.count();
  console.log(`Seed selesai: ${totalCategories} kategori.`);
  console.log(`- Admin: admin@rongsok.in / admin123`);
  console.log(`- Customer: rizky@example.com / customer123`);
  console.log(`- Collector: budi@collector.com / collector123 (Lapak Budi Yogyakarta)`);
}

async function bcryptHash(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
