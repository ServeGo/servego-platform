import prisma from '../prisma/client.js';
import { refreshProviderReputation } from '../services/providerReputationService.js';
import { notifyReviewPublished } from '../services/notificationService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { parsePagination, offsetMeta } from '../utils/pagination.js';

export const ReviewController = {
  getAll: async (req, res) => {
    try {
      const { skip, take, page, limit } = parsePagination(req.query, { limit: 20 });
      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take,
          include: {
            provider: { select: { id: true, user: { select: { name: true } } } },
            reviewer: { select: { name: true, email: true } }
          }
        }),
        prisma.review.count()
      ]);
      return sendApiSuccess(res, 200, { reviews, pagination: offsetMeta(total, page, limit) });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch reviews', err.message);
    }
  },

  getByProvider: async (req, res) => {
    try {
      const { id } = req.params;
      const { skip, take, page, limit } = parsePagination(req.query, { limit: 20 });
      const where = { providerId: id };
      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
          include: { reviewer: { select: { name: true, avatar: true } } }
        }),
        prisma.review.count({ where })
      ]);
      return sendApiSuccess(res, 200, { reviews, pagination: offsetMeta(total, page, limit) });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch provider reviews', err.message);
    }
  },

  deleteOne: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      if (!reason || !String(reason).trim()) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'A moderation reason is required.');
      }
      const review = await prisma.review.findUnique({ where: { id }, select: { id: true } });
      if (!review) return sendApiError(res, 404, 'NOT_FOUND', 'Review not found.');
      await prisma.review.delete({ where: { id } });
      return sendApiSuccess(res, 200, { message: 'Review removed.' });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to delete review', err.message);
    }
  },

  create: async (req, res) => {
    try {
      const { rating, comment, serviceCategory, providerId, bookingId } = req.body;
      const reviewerId = req.user.id;

      if (req.user.role !== 'customer') {
        return sendApiError(res, 403, 'FORBIDDEN', 'Only customers can leave provider reviews.');
      }
      if (rating === undefined || !providerId) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Missing core review parameters (rating, providerId)', {
          missing: {
            rating: rating === undefined,
            providerId: !providerId
          }
        });
      }

      const reviewer = await prisma.user.findUnique({ where: { id: reviewerId }, select: { name: true } });
      if (!reviewer) return sendApiError(res, 404, 'NOT_FOUND', 'Customer account not found.');

      const parsedRating = Number(rating);
      if (Number.isNaN(parsedRating)) {
        return sendApiError(res, 400, 'INVALID_RATING', 'rating must be a valid number');
      }
      if (parsedRating < 1 || parsedRating > 5) {
        return sendApiError(res, 400, 'INVALID_RATING', 'rating must be between 1 and 5');
      }

      if (bookingId) {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          select: { id: true, providerId: true, customerId: true, status: true }
        });

        if (!booking) return sendApiError(res, 400, 'INVALID_BOOKING', 'Invalid bookingId');
        if (booking.providerId !== providerId) {
          return sendApiError(res, 400, 'INVALID_BOOKING', 'bookingId does not belong to the given providerId');
        }
        if (booking.customerId !== reviewerId) {
          return sendApiError(res, 403, 'FORBIDDEN', 'Only the customer who booked the service can leave a review.');
        }
        if (!['COMPLETED', 'REVIEWED'].includes(booking.status)) {
          return sendApiError(res, 409, 'BOOKING_NOT_COMPLETED', 'Reviews can only be submitted after the booking is completed.');
        }
        const existingReview = await prisma.review.findFirst({ where: { bookingId }, select: { id: true } });
        if (existingReview) return sendApiError(res, 409, 'DUPLICATE_ENTRY', 'Only one review may be submitted per booking.');
      }

      const safeComment = comment === undefined ? null : String(comment);

      const review = await prisma.review.create({
        data: {
          reviewerId,
          reviewerName: reviewer.name,
          rating: parsedRating,
          comment: safeComment,
          serviceCategory,
          providerId,
          bookingId: bookingId || null
        }
      });


      if (bookingId) {
        try {
          await prisma.booking.update({
            where: { id: bookingId },
            data: { reviewed: true }
          });
        } catch (e) {
          if (e.code === 'P2025') {
            return sendApiError(res, 404, 'NOT_FOUND', 'Linked booking no longer exists.');
          }
          throw e;
        }
      }

      await refreshProviderReputation(providerId);

      await notifyReviewPublished(reviewerId);

      return sendApiSuccess(res, 201, { review });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to record customer review log',
        process.env.NODE_ENV !== 'production' ? err.message : undefined);
    }
  }
};
