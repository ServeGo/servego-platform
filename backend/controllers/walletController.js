import prisma from '../prisma/client.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import {
  getWalletOverview,
  listWalletTransactions,
  requestProviderWithdrawal,
  listMyWithdrawals,
  processProviderWithdrawal,
  listAdminWithdrawals,
  listAllWalletTransactions,
  getAdminWalletOverview,
  adminCreditWallet,
  getOrCreateWallet
} from '../services/walletService.js';
import { createNotification } from '../services/notificationService.js';
import { writeAuditLog } from '../services/auditLogService.js';
import { getConfig } from '../services/adminConfigService.js';

async function resolveProviderForUser(req, res) {
  const provider = await prisma.provider.findUnique({ where: { userId: req.user.id }, select: { id: true } });
  if (!provider) {
    sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found for this account.');
    return null;
  }
  return provider;
}

export const WalletController = {
  /** Any logged-in user: their wallet balance + recent ledger. */
  getMyWallet: async (req, res) => {
    try {
      const data = await getWalletOverview(req.user.id);
      return sendApiSuccess(res, 200, data);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load wallet', err.message);
    }
  },

  /** Any logged-in user: paginated wallet ledger. */
  getMyLedger: async (req, res) => {
    try {
      const { page = 1, limit = 25, category } = req.query;
      const data = await listWalletTransactions(req.user.id, { page, limit, category });
      return sendApiSuccess(res, 200, data);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load wallet transactions', err.message);
    }
  },

  /** Provider: request a payout from their wallet balance. */
  requestWithdrawal: async (req, res) => {
    try {
      const { amount, accountDetails, description } = req.body || {};
      const provider = await resolveProviderForUser(req, res);
      if (!provider) return;

      const request = await requestProviderWithdrawal({
        userId: req.user.id,
        providerId: provider.id,
        amount,
        accountDetails,
        description
      });

      const io = req.app?.get('socketio');
      if (io) io.to('room:admin').emit('wallet:withdrawalRequested', { withdrawalId: request.id, amount: request.amount });

      return sendApiSuccess(res, 201, {
        withdrawalId: request.id,
        status: request.status,
        amount: request.amount,
        message: 'Withdrawal request submitted for admin review.'
      });
    } catch (err) {
      const status = err.code === 'INSUFFICIENT_BALANCE' || err.code === 'BELOW_MINIMUM' ? 400 : 500;
      return sendApiError(res, status, err.code || 'INTERNAL_ERROR', err.message || 'Failed to request withdrawal');
    }
  },

  /** Provider: their own withdrawal requests. */
  getMyWithdrawals: async (req, res) => {
    try {
      const data = await listMyWithdrawals(req.user.id);
      return sendApiSuccess(res, 200, data);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load withdrawal requests', err.message);
    }
  },

  /** Provider: payout config + note shown on the withdrawal form. */
  getWithdrawalConfig: async (req, res) => {
    try {
      const wallet = await getOrCreateWallet(req.user.id);
      const [minAmount, maxAmount, note] = await Promise.all([
        getConfig('walletMinimumWithdrawal', 100),
        getConfig('walletMaximumWithdrawal', 0),
        getConfig('walletWithdrawalNote', '')
      ]);
      return sendApiSuccess(res, 200, {
        balance: Number(wallet.balance || 0),
        minimumWithdrawal: Number(minAmount),
        maximumWithdrawal: Number(maxAmount),
        note: String(note || '')
      });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load withdrawal config', err.message);
    }
  },

  /** Admin: platform-wide wallet overview. */
  getAdminWallet: async (req, res) => {
    try {
      const data = await getAdminWalletOverview();
      return sendApiSuccess(res, 200, data);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load wallet overview', err.message);
    }
  },

  /** Admin: all wallet transactions (paginated, filterable). */
  getAdminLedger: async (req, res) => {
    try {
      const { page = 1, limit = 25, category, userId } = req.query;
      const data = await listAllWalletTransactions({ page, limit, category, userId });
      return sendApiSuccess(res, 200, data);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load wallet ledger', err.message);
    }
  },

  /** Admin: withdrawal requests (default PENDING). */
  getAdminWithdrawals: async (req, res) => {
    try {
      const { page = 1, limit = 25, status = 'PENDING' } = req.query;
      const data = await listAdminWithdrawals({ status: status || null, page, limit });
      return sendApiSuccess(res, 200, data);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load withdrawal requests', err.message);
    }
  },

  /** Admin: approve / reject / mark-paid a provider withdrawal. */
  processWithdrawal: async (req, res) => {
    try {
      const { action, adminNote } = req.body || {};
      const updated = await processProviderWithdrawal({
        withdrawalId: req.params.id,
        action,
        adminId: req.user.id,
        adminNote
      });

      const io = req.app?.get('socketio');
      if (updated.userId) {
        if (updated.status === 'APPROVED') {
          await createNotification(updated.userId, 'Withdrawal approved', 'Your payout request has been approved and is being processed.', 'WALLET');
        } else if (updated.status === 'REJECTED') {
          await createNotification(updated.userId, 'Withdrawal rejected', 'Your payout request was rejected. The held amount has been returned to your wallet.', 'WALLET');
        } else if (updated.status === 'PAID') {
          await createNotification(updated.userId, 'Payout paid', 'Your payout has been transferred. Check your bank/UPI account.', 'WALLET');
        }
        if (io) io.to(`user:${updated.userId}`).emit('wallet:updated', { withdrawalId: updated.id, status: updated.status });
      }

      await writeAuditLog({
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: `PROCESS_WITHDRAWAL_${updated.status}`,
        targetType: 'WalletWithdrawal',
        targetId: updated.id,
        oldValue: { status: updated.status === 'PAID' ? 'APPROVED' : 'PENDING' },
        newValue: { status: updated.status, note: adminNote || null },
        ip: req.ip
      });

      return sendApiSuccess(res, 200, { withdrawalId: updated.id, status: updated.status });
    } catch (err) {
      const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'ALREADY_PROCESSED' || err.code === 'INVALID_ACTION' ? 400 : 500;
      return sendApiError(res, status, err.code || 'INTERNAL_ERROR', err.message || 'Failed to process withdrawal request');
    }
  },

  /** Admin: manually credit a user's wallet. */
  adminCredit: async (req, res) => {
    try {
      const { userId, amount, category, description } = req.body || {};
      if (!userId) return sendApiError(res, 400, 'MISSING_FIELDS', 'Missing required field: userId');
      await adminCreditWallet({
        userId,
        amount,
        category,
        description,
        adminId: req.user.id
      });

      await writeAuditLog({
        actorId: req.user.id,
        actorRole: 'ADMIN',
        action: 'WALLET_CREDIT',
        targetType: 'User',
        targetId: userId,
        oldValue: null,
        newValue: { amount: Number(amount), category: category || 'PROMOTIONAL_CREDIT', description: description || null },
        ip: req.ip
      });

      const io = req.app?.get('socketio');
      if (io) io.to(`user:${userId}`).emit('wallet:updated', { manualCredit: true });

      return sendApiSuccess(res, 201, { message: 'Wallet credited successfully.' });
    } catch (err) {
      const status = ['INVALID_AMOUNT', 'INVALID_CATEGORY', 'USER_NOT_FOUND'].includes(err.code) ? 400 : 500;
      return sendApiError(res, status, err.code || 'INTERNAL_ERROR', err.message || 'Failed to credit wallet');
    }
  }
};
