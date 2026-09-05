import prisma from '../prisma/client.js';
import {
  getAllConfigs,
  setConfig
} from '../services/adminConfigService.js';
import { listAllLeads, getLeadWithHistory } from '../services/leadService.js';
import { invalidateLevelCache } from '../services/providerLevelService.js';
import { writeAuditLog } from '../services/auditLogService.js';
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
      await writeAuditLog({
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: `UPDATE_CONFIG_${key}`,
        targetType: 'AdminConfig',
        targetId: key,
        oldValue: null,
        newValue: { value },
        ip: req.ip
      });
      return sendApiSuccess(res, 200, row);
    } catch (err) {
      return errorResponse(res, err, 'Failed to update admin config.');
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
      await writeAuditLog({
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'UPDATE_LEVEL_RULE',
        targetType: 'ProviderLevelRule',
        targetId: id,
        oldValue: { minJobs: existing.minJobs, discountPercent: existing.discountPercent, active: existing.active },
        newValue: { minJobs: rule.minJobs, discountPercent: rule.discountPercent, active: rule.active },
        ip: req.ip
      });
      return sendApiSuccess(res, 200, rule);
    } catch (err) {
      return errorResponse(res, err, 'Failed to update level rule.');
    }
  }
};
