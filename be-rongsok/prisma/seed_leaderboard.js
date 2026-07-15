require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting leaderboard and eco-impact seeder...");

  // 1. Fetch categories to associate with orders
  const categories = await prisma.wasteCategory.findMany();
  if (categories.length === 0) {
    console.error("Please run the base database seed first or make sure categories exist.");
    process.exit(1);
  }

  const paperCategory = categories.find(c => c.name.includes("Kertas") || c.name.includes("Kardus")) || categories[0];
  const plasticCategory = categories.find(c => c.name.includes("Plastik")) || categories[0];

  // 2. Hash password for test accounts
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('customer123', salt);
  const collectorPasswordHash = await bcrypt.hash('collector123', salt);

  // 3. Create or upsert a test collector (needed to complete orders)
  const collectorEmail = "eco.collector@example.com";
  let collector = await prisma.user.findUnique({ where: { email: collectorEmail } });
  if (!collector) {
    collector = await prisma.user.create({
      data: {
        name: "Pak Pengepul Eco",
        email: collectorEmail,
        passwordHash: collectorPasswordHash,
        role: "COLLECTOR",
        phone: "089999888777",
        isVerified: true,
      }
    });
  }

  // Ensure Collector location is set (Yogyakarta)
  await prisma.$executeRaw`
    UPDATE "User"
    SET location = ST_SetSRID(ST_MakePoint(110.3695, -7.7956), 4326)::geography
    WHERE id = ${collector.id}
  `;

  // Create Collector Profile if it doesn't exist
  let collectorProfile = await prisma.collectorProfile.findUnique({ where: { userId: collector.id } });
  if (!collectorProfile) {
    collectorProfile = await prisma.collectorProfile.create({
      data: {
        userId: collector.id,
        shopName: "Lapak Eco Yogyakarta",
        description: "Mitra Pengepul untuk Tes Dampak Ekologis",
        radiusKm: 15,
        isOpen: true,
      }
    });
  }

  // Create catalogs for the collector
  for (const cat of categories) {
    const existingCatalog = await prisma.collectorCatalog.findFirst({
      where: { collectorId: collectorProfile.id, categoryId: cat.id }
    });
    if (!existingCatalog) {
      await prisma.collectorCatalog.create({
        data: {
          collectorId: collectorProfile.id,
          categoryId: cat.id,
          minPrice: 1000,
          maxPrice: 3000,
          isActive: true
        }
      });
    }
  }

  // Define test customers and their transaction targets
  // Tier info:
  // Pemula Hijau (0 - 10 kg)
  // Pejuang Daur Ulang (10 - 50 kg)
  // Pahlawan Lingkungan (50 - 100 kg)
  // Legenda Bumi (100+ kg)
  const customerSpecs = [
    {
      name: "Tegar Pemula Pasif",
      email: "tegar.pasif@example.com",
      weightKg: 0,
      tier: "Pemula Hijau (0 kg)"
    },
    {
      name: "Arif Pemula Hijau",
      email: "arif.pemula@example.com",
      weightKg: 5.5,
      tier: "Pemula Hijau (5.5 kg)"
    },
    {
      name: "Dinda Pejuang",
      email: "dinda.pejuang@example.com",
      weightKg: 28.3,
      tier: "Pejuang Daur Ulang (28.3 kg)"
    },
    {
      name: "Gita Pahlawan",
      email: "gita.pahlawan@example.com",
      weightKg: 76.5,
      tier: "Pahlawan Lingkungan (76.5 kg)"
    },
    {
      name: "Bintang Legenda",
      email: "bintang.legenda@example.com",
      weightKg: 135.2,
      tier: "Legenda Bumi (135.2 kg)"
    }
  ];

  for (const spec of customerSpecs) {
    console.log(`Processing user: ${spec.name} for target weight: ${spec.weightKg} kg...`);

    // Create or find user
    let user = await prisma.user.findUnique({ where: { email: spec.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: spec.name,
          email: spec.email,
          passwordHash: passwordHash,
          role: "CUSTOMER",
          phone: `0812${Math.floor(10000000 + Math.random() * 90000000)}`,
          isVerified: true,
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(spec.name)}`
        }
      });
    }

    const userLng = 110.3700 + (Math.random() - 0.5) * 0.01;
    const userLat = -7.7950 + (Math.random() - 0.5) * 0.01;

    // Set User Location (Yogyakarta)
    await prisma.$executeRaw`
      UPDATE "User"
      SET location = ST_SetSRID(ST_MakePoint(${userLng}, ${userLat}), 4326)::geography
      WHERE id = ${user.id}
    `;

    // Clear previous orders to have exact weight target
    await prisma.order.deleteMany({
      where: { customerId: user.id }
    });

    if (spec.weightKg > 0) {
      // Create a COMPLETED order with the target weight
      const order = await prisma.order.create({
        data: {
          customerId: user.id,
          collectorId: collector.id,
          method: "DROPOFF",
          status: "COMPLETED",
          estimatedWeight: spec.weightKg,
          actualWeight: spec.weightKg,
          agreedPrice: 2000,
          totalPrice: spec.weightKg * 2000,
          createdAt: new Date(Date.now() - 3600000), // Created 1 hour ago
          updatedAt: new Date(),
          items: {
            create: [
              {
                categoryId: paperCategory.id,
                estimatedWeight: spec.weightKg,
                actualWeight: spec.weightKg,
                agreedPrice: 2000,
                notes: "Setoran untuk tes eco impact"
              }
            ]
          }
        }
      });

      // Create Digital Receipt
      await prisma.receipt.create({
        data: {
          orderId: order.id,
          detailsJson: {
            customer: user.id,
            collector: collector.id,
            total: spec.weightKg * 2000,
            items: [
              {
                category: paperCategory.name,
                estimatedWeight: spec.weightKg,
                actualWeight: spec.weightKg,
                agreedPrice: 2000,
                total: spec.weightKg * 2000
              }
            ]
          }
        }
      });

      console.log(`- Created order for ${spec.name} with ${spec.weightKg} kg.`);
    } else {
      console.log(`- User ${spec.name} is inactive (0 kg). No orders created.`);
    }
  }

  console.log("Leaderboard and Eco-Impact seeder successfully completed!");
  console.log("All accounts password: customer123");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
