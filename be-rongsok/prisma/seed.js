require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// ── Taksonomi kategori bertingkat ────────────────────────────────────────
// Induk (kategori utama) + anak (item spesifik yang dihargai & dipesan).
const TAXONOMY = [
  {
    name: 'Plastik',
    description: 'Botol, gelas, dan plastik keras bekas',
    children: [
      { name: 'Botol Plastik Bening', unit: 'kg', description: 'Botol air mineral, soda, jus' },
      { name: 'Botol Sabun / Jerigen', unit: 'kg', description: 'Botol sampo, sabun cair, oli, jerigen kecil' },
      { name: 'Gelas Plastik', unit: 'kg', description: 'Gelas kopi kemasan, air mineral, cup boba' },
      { name: 'Ember / Plastik Keras', unit: 'kg', description: 'Ember, gayung, baskom, mainan keras' },
    ],
  },
  {
    name: 'Kertas & Kardus',
    description: 'Kardus, kertas, koran bekas',
    children: [
      { name: 'Kardus', unit: 'kg', description: 'Kardus paket e-commerce, mi instan, rokok' },
      { name: 'Kertas Putih', unit: 'kg', description: 'Buku tulis bekas, HVS, dokumen' },
      { name: 'Koran & Majalah', unit: 'kg', description: 'Koran, majalah, brosur bekas' },
    ],
  },
  {
    name: 'Logam & Besi',
    description: 'Besi, aluminium, tembaga bekas',
    children: [
      { name: 'Besi Tua / Seng', unit: 'kg', description: 'Pagar besi, paku, pipa, seng, kaleng' },
      { name: 'Aluminium', unit: 'kg', description: 'Kaleng soda, panci, wajan, jemuran' },
      { name: 'Kabel & Tembaga', unit: 'kg', description: 'Kabel bekas, kuningan — harga premium' },
    ],
  },
  {
    name: 'Kaca & Botol',
    description: 'Botol kaca utuh & pecahan kaca',
    children: [
      { name: 'Botol Kaca Utuh', unit: 'pcs', description: 'Botol kecap, sirup, bir — dihargai per botol' },
      { name: 'Pecahan Kaca', unit: 'kg', description: 'Beling, pecahan kaca jendela/botol' },
    ],
  },
  {
    name: 'Elektronik',
    description: 'Elektronik mati total',
    children: [
      { name: 'Elektronik Besar', unit: 'pcs', description: 'TV, kulkas, mesin cuci, AC rusak' },
      { name: 'HP & Laptop Rusak', unit: 'pcs', description: 'HP, laptop, komputer mati' },
      { name: 'Aki Bekas', unit: 'pcs', description: 'Aki mobil/motor yang sudah tekor' },
    ],
  },
  {
    name: 'Lain-lain',
    description: 'Kategori khusus lainnya',
    children: [
      { name: 'Minyak Jelantah', unit: 'liter', description: 'Minyak goreng bekas — ditampung per liter' },
    ],
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

  // Seed taksonomi: induk dulu, lalu anak
  for (let i = 0; i < TAXONOMY.length; i++) {
    const main = TAXONOMY[i];
    const parent = await prisma.wasteCategory.create({
      data: {
        name: main.name,
        description: main.description,
        unit: 'kg',
        sortOrder: i,
        parentId: null,
      },
    });

    for (let j = 0; j < main.children.length; j++) {
      const child = main.children[j];
      await prisma.wasteCategory.create({
        data: {
          name: child.name,
          description: child.description,
          unit: child.unit || 'kg',
          sortOrder: j,
          parentId: parent.id,
        },
      });
    }
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
  console.log(`Seed selesai: ${total} kategori (6 induk + sub-item). Admin: admin@rongsok.in / admin123`);
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
