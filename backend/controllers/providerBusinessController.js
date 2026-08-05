import prisma from '../prisma/client.js';
import {
  getPromotionHistory,
  getLevelHistory,
  acknowledgePromotion,
  levelOrder
} from '../services/providerLevelService.js';
import { getPerformance } from '../services/providerPerformanceService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

async function resolveProviderId(req) {
  const provider = await prisma.provider.findUnique({
    where: { userId: req.user.id },
    select: { id: true }
  });
  return provider?.id || null;
}

function errorResponse(res, err, fallback) {
  const code = err.code && err.code !== 'INTERNAL_ERROR' ? err.code : 'INTERNAL_ERROR';
  return sendApiError(res, code === 'INTERNAL_ERROR' ? 500 : 400, code,
    code === 'INTERNAL_ERROR' ? fallback : err.message,
    process.env.NODE_ENV !== 'production' && code === 'INTERNAL_ERROR' ? err.message : undefined);
}

export const ProviderBusinessController = {
  /** Provider level + live performance dashboard data. */
  getMyPerformance: async (req, res) => {
    try {
      const providerId = await resolveProviderId(req);
      if (!providerId) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');

      const [provider, performance] = await Promise.all([
        prisma.provider.findUnique({
          where: { id: providerId },
          select: {
            id: true,
            providerLevel: true,
            promotionDate: true,
            sector: true,
            rating: true,
            reviewCount: true,
            jobsCompleted: true,
            experienceYears: true,
            serviceFee: true,
            latitude: true,
            longitude: true,
            subscription: {
              select: {
                level: true,
                remainingLeads: true,
                status: true,
                paymentStatus: true,
                leadCount: true,
                price: true,
                discountAmount: true,
                finalAmount: true,
                paymentMethod: true,
                transactionId: true,
                invoiceNumber: true,
                lastPurchaseAt: true,
                activatedAt: true,
                sector: true,
                planId: true,
                plan: true
              }
            }
          }
        }),
        getPerformance(providerId)
      ]);

      return sendApiSuccess(res, 200, {
        provider,
        performance,
        levelOrder: levelOrder()
      });
    } catch (err) {
      return errorResponse(res, err, 'Failed to load provider performance.');
    }
  },

  /** Promotion (level-up) history for the provider dashboard. */
  getMyPromotions: async (req, res) => {
    try {
      const providerId = await resolveProviderId(req);
      if (!providerId) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');
      const promotions = await getPromotionHistory(providerId);
      return sendApiSuccess(res, 200, promotions);
    } catch (err) {
      return errorResponse(res, err, 'Failed to load promotions.');
    }
  },

  /** Acknowledge a promotion so the celebration popup is not shown again. */
  acknowledgePromotion: async (req, res) => {
    try {
      const providerId = await resolveProviderId(req);
      if (!providerId) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');

      const promotion = await prisma.promotionHistory.findUnique({ where: { id: req.params.id } });
      if (!promotion) return sendApiError(res, 404, 'NOT_FOUND', 'Promotion not found.');
      if (promotion.providerId !== providerId) {
        return sendApiError(res, 403, 'FORBIDDEN', 'You can only acknowledge your own promotions.');
      }

      const updated = await acknowledgePromotion(promotion.id);
      return sendApiSuccess(res, 200, updated);
    } catch (err) {
      return errorResponse(res, err, 'Failed to acknowledge promotion.');
    }
  },

  /** Full level-change ledger (INITIAL + every promotion). */
  getMyLevelHistory: async (req, res) => {
    try {
      const providerId = await resolveProviderId(req);
      if (!providerId) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');
      const history = await getLevelHistory(providerId);
      return sendApiSuccess(res, 200, history);
    } catch (err) {
      return errorResponse(res, err, 'Failed to load level history.');
    }
  },

  /** Active level rules (thresholds + discounts) for the provider dashboard. */
  getLevelRules: async (req, res) => {
    try {
      const rules = await prisma.providerLevelRule.findMany({
        where: { active: true },
        orderBy: { minJobs: 'asc' }
      });
      return sendApiSuccess(res, 200, rules);
    } catch (err) {
      return errorResponse(res, err, 'Failed to load level rules.');
    }
  }
};
