require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Cleanup existing data (optional)
  await prisma.rating.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.orderCollector.deleteMany();
  await prisma.order.deleteMany();
  await prisma.collectorCatalog.deleteMany();
  await prisma.wasteCategory.deleteMany();
  await prisma.collectorProfile.deleteMany();
  await prisma.user.deleteMany();

  // Waste Categories
  const categories = await Promise.all([
    prisma.wasteCategory.create({ 
      data: { 
        name: 'Kardus', 
        description: 'Karton tebal kemasan, box bekas, pastikan dalam kondisi kering', 
        iconUrl: 'https://example.com/icons/kardus.png' 
      } 
    }),
    prisma.wasteCategory.create({ 
      data: { 
        name: 'Plastik', 
        description: 'Botol PET transparan, gelas plastik bersih, pisahkan dari tutupnya', 
        iconUrl: 'https://example.com/icons/plastik.png' 
      } 
    }),
    prisma.wasteCategory.create({ 
      data: { 
        name: 'Kertas', 
        description: 'Kertas HVS bekas, koran, buku tanpa jilid lem tebal', 
        iconUrl: 'https://example.com/icons/kertas.png' 
      } 
    })
  ]);

  // Users
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Rongsok',
      email: 'admin@rongsok.in',
      passwordHash: await bcryptHash('admin123'),
      role: 'ADMIN',
    }
  });

  console.log('Seed data created successfully');
}

// Helper to hash passwords using bcryptjs
const bcrypt = require('bcryptjs');
async function bcryptHash(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
