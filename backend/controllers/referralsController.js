import prisma from '../prisma/client.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

const normalizeCode = (code) => (code || '').toString().trim();

export const ReferralsController = {
  applyReferral: async (req, res) => {
    try {
      const { code } = req.body || {};
      const userId = req.user.id;
      if (!code) return sendApiError(res, 400, 'MISSING_FIELDS', 'Missing required field: code');

      const normalized = normalizeCode(code);
      const sponsor = await prisma.user.findFirst({
        where: { referralCode: normalized },
        select: { id: true, referralCode: true }
      });

      if (!sponsor) return sendApiError(res, 404, 'NOT_FOUND', 'Invalid referral code');

      if (sponsor.id === userId) {
        return sendApiError(res, 400, 'INVALID_REFERRAL', 'You cannot apply your own referral code.');
      }

      const applicant = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, referredBy: true } });
      if (!applicant) return sendApiError(res, 404, 'NOT_FOUND', 'User not found');
      if (applicant.referredBy) {
        return sendApiError(res, 409, 'DUPLICATE_ENTRY', 'Referral code already applied.');
      }

      const BONUS_EARNED = 250;

      const result = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: applicant.id },
          data: { referredBy: sponsor.referralCode, referralBonusEarned: BONUS_EARNED }
        });

        await tx.user.update({
          where: { id: sponsor.id },
          data: { referralsCount: { increment: 1 } }
        });

        const sponsorUpdated = await tx.user.findUnique({
          where: { id: sponsor.id },
          select: { referralsCount: true, referralDiscountBalance: true }
        });

        return {
          referredBy: sponsor.referralCode,
          referredCount: sponsorUpdated.referralsCount,
          bonusEarned: BONUS_EARNED
        };
      });

      return sendApiSuccess(res, 200, result);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to apply referral code', err.message);
    }
  },

  getMeReferral: async (req, res) => {
    try {
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { referredBy: true, referralCode: true, referralsCount: true, referralDiscountBalance: true, referralBonusEarned: true }
      });

      if (!user) return sendApiError(res, 404, 'NOT_FOUND', 'User not found');

      return sendApiSuccess(res, 200, {
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        referredCount: user.referralsCount,
        bonusEarned: user.referralBonusEarned || 0,
        discountBalance: user.referralDiscountBalance || 0
      });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch referral info', err.message);
    }
  },

  generate: async (req, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { referralCode: true, role: true, name: true } });
      if (!user) return sendApiError(res, 404, 'NOT_FOUND', 'User not found');
      if (user.referralCode) return sendApiSuccess(res, 200, { referralCode: user.referralCode });
      const prefix = user.role === 'provider' ? 'PRO' : 'CUST';
      const code = `SERVEGO-${prefix}-${user.name.slice(0, 3).toUpperCase().replace(/\s/g, 'X')}${Math.floor(100 + Math.random() * 900)}`;
      const updated = await prisma.user.update({ where: { id: req.user.id }, data: { referralCode: code }, select: { referralCode: true } });
      return sendApiSuccess(res, 201, updated);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to generate referral code', err.message);
    }
  }
};

