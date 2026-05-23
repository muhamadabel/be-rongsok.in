const prisma = require('../config/prisma');
const { z } = require('zod');

const orderSchema = z.object({
  categoryId: z.string(),
  method: z.enum(['PICKUP', 'DROPOFF']),
  photoUrl: z.string().optional(),
  estimatedWeight: z.number(),
  lat: z.number(),
  lng: z.number()
});

const createOrder = async (req, res, next) => {
  try {
    const data = orderSchema.parse(req.body);
    const io = req.app.get('io');

    // 1. Create Order record
    const order = await prisma.order.create({
      data: {
        customerId: req.user.id,
        categoryId: data.categoryId,
        method: data.method,
        photoUrl: data.photoUrl,
        estimatedWeight: data.estimatedWeight,
        status: 'PENDING'
      }
    });

    // 2. Find nearby collectors to notify (PostGIS)
    const collectors = await prisma.$queryRaw`
      SELECT cp.id, cp."userId"
      FROM "CollectorProfile" cp
      JOIN "User" u ON cp."userId" = u.id
      JOIN "CollectorCatalog" cc ON cp.id = cc."collectorId"
      WHERE 
        cc."categoryId" = ${data.categoryId} AND 
        cp."isOpen" = true AND
        ST_DWithin(u.location, ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326)::geography, cp."radiusKm" * 1000)
    `;

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
          category: data.categoryId,
          estWeight: data.estimatedWeight,
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
    const { action, actualWeight, agreedPrice } = req.body;
    const io = req.app.get('io');

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ status: 'error', message: 'Order not found' });

    let newStatus = order.status;

    switch (action) {
      case 'accept':
        if (order.status !== 'PENDING') return res.status(400).json({ message: 'Order already taken' });
        newStatus = 'CONFIRMED';
        await prisma.order.update({
          where: { id },
          data: { status: newStatus, collectorId: req.user.id }
        });
        break;
      
      case 'validate': // Collector submits actual weight
        if (order.status !== 'CONFIRMED' && order.status !== 'IN_PROGRESS') return res.status(400).json({ message: 'Invalid state' });
        const { transactionProofUrl } = req.body;
        newStatus = 'AWAITING_CONFIRMATION';
        await prisma.order.update({
          where: { id },
          data: { 
            status: newStatus, 
            actualWeight: parseFloat(actualWeight), 
            agreedPrice: parseFloat(agreedPrice),
            totalPrice: parseFloat(actualWeight) * parseFloat(agreedPrice),
            transactionProofUrl: transactionProofUrl || null
          }
        });
        break;

      case 'confirm': // Customer accepts price
        if (order.status !== 'AWAITING_CONFIRMATION') return res.status(400).json({ message: 'Invalid state' });
        newStatus = 'COMPLETED';
        const updatedOrder = await prisma.order.update({
          where: { id },
          data: { status: newStatus }
        });
        // Generate Digital Receipt here
        await prisma.receipt.create({
          data: {
            orderId: order.id,
            detailsJson: {
              customer: order.customerId,
              collector: order.collectorId,
              total: parseFloat(actualWeight || order.actualWeight) * parseFloat(agreedPrice || order.agreedPrice),
              transactionProofUrl: updatedOrder.transactionProofUrl
            }
          }
        });
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

const getOrderDetails = async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { customer: true, collector: true, category: true }
    });
    res.status(200).json({ status: 'success', data: order });
  } catch (error) {
    next(error);
  }
};

module.exports = { createOrder, updateStatus, getOrderDetails };
