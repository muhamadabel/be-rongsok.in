const prisma = require('../config/prisma');
const { z } = require('zod');

const ratingSchema = z.object({
  orderId: z.string(),
  rateeId: z.string(),
  score: z.number().min(1).max(5),
  reviewText: z.string().optional(),
  photoUrl: z.string().optional()
});

const submitRating = async (req, res, next) => {
  try {
    const data = ratingSchema.parse(req.body);

    // 1. Save rating
    const rating = await prisma.rating.create({
      data: {
        orderId: data.orderId,
        raterId: req.user.id,
        rateeId: data.rateeId,
        score: data.score,
        reviewText: data.reviewText,
        photoUrl: data.photoUrl
      }
    });

    // 2. Update average rating of ratee
    const ratings = await prisma.rating.aggregate({
      where: { rateeId: data.rateeId },
      _avg: { score: true }
    });

    await prisma.user.update({
      where: { id: data.rateeId },
      data: { avgRating: ratings._avg.score }
    });

    res.status(201).json({ status: 'success', data: rating });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({ status: 'error', message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const getUserRatings = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const ratings = await prisma.rating.findMany({
      where: { rateeId: userId },
      include: { rater: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ status: 'success', data: ratings });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitRating, getUserRatings };
