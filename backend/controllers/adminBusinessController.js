import prisma from '../prisma/client.js';
import {
  getAllConfigs,
  setConfig
} from '../services/adminConfigService.js';
import { listAllLeads, getLeadWithHistory } from '../services/leadService.js';
import { invalidateLevelCache } from '../services/providerLevelService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

function errorResponse(res, err, fallback) {
  const code = err.code && err.code !== 'INTERNAL_ERROR' ? err.code : 'INTERNAL_ERROR';
  return sendApiError(res, code === 'INTERNAL_ERROR' ? 500 : 400, code,
    code === 'INTERNAL_ERROR' ? fallback : err.message,
    process.env.NODE_ENV !== 'production' && code === 'INTERNAL_ERROR' ? err.message : undefined);
}

export const AdminBusinessController = {
  // --- Config ---
  getConfigs: async (req, res) => {
    try {
      const configs = await getAllConfigs();
      return sendApiSuccess(res, 200, configs);
    } catch (err) {
      return errorResponse(res, err, 'Failed to load admin config.');
    }
  },

  updateConfig: async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      if (value === undefined) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'value is required.');
      }
      const row = await setConfig(key, value, req.user.id);
      return sendApiSuccess(res, 200, row);
    } catch (err) {
      return errorResponse(res, err, 'Failed to update admin config.');
    }
  },

  // --- Subscription plans ---
  getPlans: async (req, res) => {
    try {
      const plans = await prisma.subscriptionPlan.findMany({ orderBy: { level: 'asc' } });
      return sendApiSuccess(res, 200, plans);
    } catch (err) {
      return errorResponse(res, err, 'Failed to load subscription plans.');
    }
  },

  createPlan: async (req, res) => {
    try {
      const { level, name, price, leadCount, sector, isFree, description, active } = req.body;
      if (level == null || !name) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'level and name are required.');
      }
      const plan = await prisma.subscriptionPlan.create({
        data: {
          level: Number(level),
          name: String(name),
          price: price == null ? 0 : Number(price),
          leadCount: leadCount == null ? 3 : Number(leadCount),
          sector: sector || 'GENERAL',
          isFree: Boolean(isFree),
          description: description || null,
          active: active == null ? true : Boolean(active)
        }
      });
      return sendApiSuccess(res, 201, plan);
    } catch (err) {
      if (err.code === 'P2002') {
        return sendApiError(res, 409, 'LEVEL_EXISTS', 'A plan with this level already exists.');
      }
      return errorResponse(res, err, 'Failed to create subscription plan.');
    }
  },

  updatePlan: async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
      if (!existing) return sendApiError(res, 404, 'NOT_FOUND', 'Plan not found.');

      const { level, name, price, leadCount, sector, isFree, description, active } = req.body;
      const plan = await prisma.subscriptionPlan.update({
        where: { id },
        data: {
          ...(level != null ? { level: Number(level) } : {}),
          ...(name != null ? { name: String(name) } : {}),
          ...(price != null ? { price: Number(price) } : {}),
          ...(leadCount != null ? { leadCount: Number(leadCount) } : {}),
          ...(sector != null ? { sector } : {}),
          ...(isFree != null ? { isFree: Boolean(isFree) } : {}),
          ...(description !== undefined ? { description: description || null } : {}),
          ...(active != null ? { active: Boolean(active) } : {})
        }
      });
      return sendApiSuccess(res, 200, plan);
    } catch (err) {
      if (err.code === 'P2002') {
        return sendApiError(res, 409, 'LEVEL_EXISTS', 'A plan with this level already exists.');
      }
      return errorResponse(res, err, 'Failed to update subscription plan.');
    }
  },

  // --- Leads ---
  getLeads: async (req, res) => {
    try {
      const { status, page = 1, limit = 50 } = req.query;
      const result = await listAllLeads({ status, page, limit });
      return sendApiSuccess(res, 200, result);
    } catch (err) {
      return errorResponse(res, err, 'Failed to load leads.');
    }
  },

  getLeadById: async (req, res) => {
    try {
      const lead = await getLeadWithHistory(req.params.id);
      if (!lead) return sendApiError(res, 404, 'NOT_FOUND', 'Lead not found.');
      return sendApiSuccess(res, 200, lead);
    } catch (err) {
      return errorResponse(res, err, 'Failed to load lead.');
    }
  },

  // --- Provider performance (admin) ---
  getProviderPerformance: async (req, res) => {
    try {
      const { page = 1, limit = 50, search } = req.query;
      const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, Math.max(1, parseInt(limit)));

      const where = search
        ? { provider: { user: { name: { contains: String(search), mode: 'insensitive' } } } }
        : {};

      const [rows, total] = await Promise.all([
        prisma.providerPerformance.findMany({
          where,
          skip,
          take: Math.min(100, Math.max(1, parseInt(limit))),
          include: {
            provider: {
              select: {
                id: true,
                providerLevel: true,
                sector: true,
                jobsCompleted: true,
                user: { select: { id: true, name: true, email: true } }
              }
            }
          },
          orderBy: { updatedAt: 'desc' }
        }),
        prisma.providerPerformance.count({ where })
      ]);

      return sendApiSuccess(res, 200, {
        performance: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / Math.min(100, Math.max(1, parseInt(limit))))
        }
      });
    } catch (err) {
      return errorResponse(res, err, 'Failed to load provider performance.');
    }
  },

  // --- Analytics ---
  getCancellationAnalytics: async (req, res) => {
    try {
      const byActor = await prisma.cancellationReason.groupBy({
        by: ['actor'],
        _count: { _all: true }
      });
      const byReason = await prisma.cancellationReason.groupBy({
        by: ['reason'],
        _count: { _all: true },
        orderBy: { _count: { reason: 'desc' } },
        take: 25
      });
      const recent = await prisma.cancellationReason.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          booking: {
            select: {
              id: true,
              serviceCategory: true,
              amount: true,
              provider: { select: { id: true, providerLevel: true, user: { select: { name: true } } } }
            }
          },
          lead: { select: { id: true, serviceCategory: true } }
        }
      });
      return sendApiSuccess(res, 200, { byActor, byReason, recent });
    } catch (err) {
      return errorResponse(res, err, 'Failed to load cancellation analytics.');
    }
  },

  getSubscriptionAnalytics: async (req, res) => {
    try {
      const byPlan = await prisma.subscriptionTransaction.groupBy({
        by: ['levelPurchased'],
        _count: { _all: true },
        _sum: { finalAmount: true },
        orderBy: { levelPurchased: 'asc' }
      });
      const revenueTotals = await prisma.subscriptionTransaction.aggregate({
        _sum: { finalAmount: true, discountAmount: true, price: true },
        _count: { _all: true }
      });
      const recent = await prisma.subscriptionTransaction.findMany({
        orderBy: { purchasedAt: 'desc' },
        take: 20,
        include: { provider: { include: { user: { select: { name: true, email: true } } } }, plan: true }
      });
      return sendApiSuccess(res, 200, { byPlan, revenueTotals, recent });
    } catch (err) {
      return errorResponse(res, err, 'Failed to load subscription analytics.');
    }
  },

  getPromotionAnalytics: async (req, res) => {
    try {
      const byLevel = await prisma.promotionHistory.groupBy({
        by: ['toLevel'],
        _count: { _all: true },
        orderBy: { _count: { toLevel: 'desc' } }
      });
      const recent = await prisma.promotionHistory.findMany({
        orderBy: { promotedAt: 'desc' },
        take: 30,
        include: { provider: { include: { user: { select: { name: true, email: true } } } } }
      });
      return sendApiSuccess(res, 200, { byLevel, recent });
    } catch (err) {
      return errorResponse(res, err, 'Failed to load promotion analytics.');
    }
  },

  /** Rebuild the provider level cache after editing level rules. */
  invalidateLevelCache: async (req, res) => {
    try {
      invalidateLevelCache();
      return sendApiSuccess(res, 200, { ok: true });
    } catch (err) {
      return errorResponse(res, err, 'Failed to invalidate level cache.');
    }
  },

  // --- Provider level rules ---
  getLevelRules: async (req, res) => {
    try {
      const rules = await prisma.providerLevelRule.findMany({ orderBy: { minJobs: 'asc' } });
      return sendApiSuccess(res, 200, rules);
    } catch (err) {
      return errorResponse(res, err, 'Failed to load level rules.');
    }
  },

  updateLevelRule: async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await prisma.providerLevelRule.findUnique({ where: { id } });
      if (!existing) return sendApiError(res, 404, 'NOT_FOUND', 'Level rule not found.');

      const { minJobs, discountPercent, description, active } = req.body;
      const rule = await prisma.providerLevelRule.update({
        where: { id },
        data: {
          ...(minJobs != null ? { minJobs: Number(minJobs) } : {}),
          ...(discountPercent != null ? { discountPercent: Number(discountPercent) } : {}),
          ...(description !== undefined ? { description: description || null } : {}),
          ...(active != null ? { active: Boolean(active) } : {})
        }
      });
      invalidateLevelCache();
      return sendApiSuccess(res, 200, rule);
    } catch (err) {
      return errorResponse(res, err, 'Failed to update level rule.');
    }
  }
};
