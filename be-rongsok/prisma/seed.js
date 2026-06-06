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
  // Hapus data yang merujuk kategori (FK-safe). DB fresh, jadi aman.
  await prisma.rating.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.orderCollector.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.collectorCatalog.deleteMany();
  await prisma.wasteCategory.deleteMany();

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

  // Pastikan ada akun admin (upsert — tidak hapus user lain)
  const adminHash = await bcryptHash('admin123');
  await prisma.user.upsert({
    where: { email: 'admin@rongsok.in' },
    update: { role: 'ADMIN' },
    create: {
      name: 'Admin Rongsok',
      email: 'admin@rongsok.in',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  const total = await prisma.wasteCategory.count();
  console.log(`Seed selesai: ${total} kategori. Admin: admin@rongsok.in / admin123`);
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
