const prisma = require('../config/prisma');
const { z } = require('zod');

const orderSchema = z.object({
  categoryId: z.string().optional(),
  estimatedWeight: z.number().optional(),
  notes: z.string().optional(),
  method: z.enum(['PICKUP', 'DROPOFF']),
  photoUrl: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  collectorId: z.string().optional(),
  items: z.array(z.object({
    categoryId: z.string(),
    estimatedWeight: z.number(),
    notes: z.string().optional()
  })).optional()
});

const createOrder = async (req, res, next) => {
  try {
    const data = orderSchema.parse(req.body);
    const io = req.app.get('io');

    // Parse items to create
    let itemsToCreate = [];
    if (data.items && data.items.length > 0) {
      itemsToCreate = data.items;
    } else if (data.categoryId && data.estimatedWeight) {
      itemsToCreate = [{
        categoryId: data.categoryId,
        estimatedWeight: data.estimatedWeight,
        notes: data.notes
      }];
    } else {
      return res.status(422).json({
        status: 'error',
        message: 'Either items array or both categoryId and estimatedWeight must be provided'
      });
    }

    const totalEstimatedWeight = itemsToCreate.reduce((sum, item) => sum + item.estimatedWeight, 0);

    // 1. Create Order record
    const order = await prisma.order.create({
      data: {
        customerId: req.user.id,
        categoryId: itemsToCreate.length === 1 ? itemsToCreate[0].categoryId : null,
        estimatedWeight: totalEstimatedWeight,
        method: data.method,
        photoUrl: data.photoUrl,
        collectorId: data.collectorId || null,
        status: 'PENDING',
        items: {
          create: itemsToCreate.map(item => ({
            categoryId: item.categoryId,
            estimatedWeight: item.estimatedWeight,
            notes: item.notes || null
          }))
        }
      },
      include: {
        items: true
      }
    });

    const categoryIds = itemsToCreate.map(item => item.categoryId);

    // 2. Find collectors to notify
    let collectors = [];
    if (data.collectorId) {
      // Direct selection or DROPOFF - find this specific collector
      const collectorUser = await prisma.user.findUnique({
        where: { id: data.collectorId },
        include: { collectorProfile: true }
      });
      if (collectorUser && collectorUser.collectorProfile) {
        collectors = [{
          id: collectorUser.collectorProfile.id,
          userId: collectorUser.id
        }];
      }
    } else {
      // Broadcast to nearby collectors based on PostGIS and categories
      collectors = await prisma.$queryRaw`
        SELECT DISTINCT cp.id, cp."userId"
        FROM "CollectorProfile" cp
        JOIN "User" u ON cp."userId" = u.id
        JOIN "CollectorCatalog" cc ON cp.id = cc."collectorId"
        WHERE 
          cc."categoryId" = ANY(${categoryIds}) AND 
          cc."isActive" = true AND
          cp."isOpen" = true AND
          ST_DWithin(u.location, ST_SetSRID(ST_MakePoint(${parseFloat(data.lng)}, ${parseFloat(data.lat)}), 4326)::geography, cp."radiusKm" * 1000)
      `;
    }

    // 3. Map order to collectors and broadcast
    const mappingData = collectors.map(c => ({
      orderId: order.id,
      collectorId: c.userId,
      status: 'notified'
    }));

    if (mappingData.length > 0) {
      await prisma.orderCollector.createMany({ data: mappingData });
      
      // Notify each collector via Socket.IO
      collectors.forEach(c => {
        io.to(`collector:${c.userId}`).emit('new_order', {
          orderId: order.id,
          category: categoryIds[0],
          categories: categoryIds,
          estWeight: totalEstimatedWeight,
          method: data.method
        });
      });
    }

    res.status(201).json({ status: 'success', data: order });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ status: 'error', message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, actualWeight, agreedPrice, items: validateItems } = req.body;
    const io = req.app.get('io');

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ status: 'error', message: 'Order not found' });

    let newStatus = order.status;

    switch (action) {
      case 'accept':
        if (order.status !== 'PENDING') return res.status(400).json({ message: 'Order already taken' });
        
        // Check collector's concurrent active orders limit
        const collectorProfile = await prisma.collectorProfile.findUnique({
          where: { userId: req.user.id }
        });
        
        if (collectorProfile) {
          const activeOrdersCount = await prisma.order.count({
            where: {
              collectorId: req.user.id,
              status: {
                in: ['CONFIRMED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION']
              }
            }
          });
          
          if (activeOrdersCount >= collectorProfile.maxConcurrentOrders) {
            return res.status(400).json({
              status: 'error',
              message: `Anda telah mencapai batas maksimal pesanan aktif (${collectorProfile.maxConcurrentOrders} pesanan). Selesaikan pesanan yang ada terlebih dahulu.`
            });
          }
        }

        newStatus = 'CONFIRMED';
        await prisma.order.update({
          where: { id },
          data: { status: newStatus, collectorId: req.user.id }
        });
        break;
      
      case 'validate': // Collector submits actual weight & price per category
        if (order.status !== 'CONFIRMED' && order.status !== 'IN_PROGRESS') {
          return res.status(400).json({ message: 'Invalid state' });
        }
        
        const { transactionProofUrl } = req.body;
        newStatus = 'AWAITING_CONFIRMATION';
        
        let calculatedTotalPrice = 0;
        let totalActualWeight = 0;

        if (validateItems && validateItems.length > 0) {
          // Multi-item validation
          for (const item of validateItems) {
            await prisma.orderItem.update({
              where: { id: item.id },
              data: {
                actualWeight: parseFloat(item.actualWeight),
                agreedPrice: parseFloat(item.agreedPrice)
              }
            });
            calculatedTotalPrice += parseFloat(item.actualWeight) * parseFloat(item.agreedPrice);
            totalActualWeight += parseFloat(item.actualWeight);
          }

          await prisma.order.update({
            where: { id },
            data: {
              status: newStatus,
              actualWeight: totalActualWeight,
              totalPrice: calculatedTotalPrice,
              transactionProofUrl: transactionProofUrl || null
            }
          });
        } else {
          // Single-item fallback
          const weight = parseFloat(actualWeight);
          const price = parseFloat(agreedPrice);
          calculatedTotalPrice = weight * price;
          totalActualWeight = weight;

          const firstItem = await prisma.orderItem.findFirst({ where: { orderId: id } });
          if (firstItem) {
            await prisma.orderItem.update({
              where: { id: firstItem.id },
              data: {
                actualWeight: weight,
                agreedPrice: price
              }
            });
          }

          await prisma.order.update({
            where: { id },
            data: {
              status: newStatus,
              actualWeight: weight,
              agreedPrice: price,
              totalPrice: calculatedTotalPrice,
              transactionProofUrl: transactionProofUrl || null
            }
          });
        }
        break;

      case 'confirm': // Customer accepts price
        if (order.status !== 'AWAITING_CONFIRMATION') return res.status(400).json({ message: 'Invalid state' });
        newStatus = 'COMPLETED';
        const updatedOrder = await prisma.order.update({
          where: { id },
          data: { status: newStatus },
          include: { items: { include: { category: true } } }
        });

        // Generate Digital Receipt
        const receiptItems = updatedOrder.items.map(item => ({
          category: item.category.name,
          estimatedWeight: item.estimatedWeight,
          actualWeight: item.actualWeight,
          agreedPrice: item.agreedPrice,
          notes: item.notes,
          total: (item.actualWeight || 0) * (item.agreedPrice || 0)
        }));

        await prisma.receipt.create({
          data: {
            orderId: order.id,
            detailsJson: {
              customer: order.customerId,
              collector: order.collectorId,
              total: updatedOrder.totalPrice || parseFloat(actualWeight || order.actualWeight) * parseFloat(agreedPrice || order.agreedPrice),
              transactionProofUrl: updatedOrder.transactionProofUrl,
              items: receiptItems.length > 0 ? receiptItems : undefined
            }
          }
        });
        break;

      case 'reject': // Collector menolak — order tetap PENDING, hilang dari antrean collector ini
        await prisma.orderCollector.updateMany({
          where: { orderId: id, collectorId: req.user.id },
          data: { status: 'rejected' }
        });
        return res.status(200).json({
          status: 'success',
          data: { orderId: id, status: order.status, rejected: true }
        });

      case 'cancel': // Customer (atau collector terkait) membatalkan order
        if (!['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(order.status)) {
          return res.status(400).json({ status: 'error', message: 'Pesanan tidak bisa dibatalkan pada status ini' });
        }
        if (order.customerId !== req.user.id && order.collectorId !== req.user.id) {
          return res.status(403).json({ status: 'error', message: 'Anda tidak berhak membatalkan pesanan ini' });
        }
        newStatus = 'CANCELLED';
        await prisma.order.update({ where: { id }, data: { status: newStatus } });
        break;

      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    // Broadcast status update
    io.to(`order:${order.id}`).emit('order_status_update', { orderId: order.id, status: newStatus });
    
    res.status(200).json({ status: 'success', data: { orderId: order.id, status: newStatus } });
  } catch (error) {
    next(error);
  }
};

// GET /orders — list order milik user. Filter: status, role (customer|collector), limit.
const getOrders = async (req, res, next) => {
  try {
    const { status, role, limit = 10 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (role === 'collector') {
      where.collectorId = req.user.id;
    } else {
      where.customerId = req.user.id;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        collector: {
          select: {
            id: true, name: true, email: true, phone: true, avatarUrl: true,
            collectorProfile: { select: { shopName: true } }
          }
        },
        category: true,
        items: { include: { category: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit) || 10
    });

    res.status(200).json({ status: 'success', data: orders });
  } catch (error) {
    next(error);
  }
};

const getOrderDetails = async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        collector: {
          include: { collectorProfile: true }
        },
        category: true,
        items: {
          include: { category: true }
        }
      }
    });
    res.status(200).json({ status: 'success', data: order });
  } catch (error) {
    next(error);
  }
};

module.exports = { createOrder, updateStatus, getOrderDetails, getOrders };
