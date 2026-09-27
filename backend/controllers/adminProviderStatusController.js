import prisma from '../prisma/client.js';
import { writeAuditLog } from '../services/auditLogService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { invalidateServiceStatsCaches } from '../services/serviceCacheService.js';
import { revokeAllForUser } from '../services/refreshSessionService.js';

const VALID_STATUSES = ['ACTIVE', 'ON_HOLD', 'BLOCKED'];

export const AdminProviderStatusController = {
  setStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body || {};

      if (!status || !VALID_STATUSES.includes(status)) {
        return sendApiError(res, 400, 'INVALID_STATUS', `status must be one of: ${VALID_STATUSES.join(', ')}`);
      }
      if (!reason || !String(reason).trim()) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'A reason is required when changing provider account status.');
      }

      const provider = await prisma.provider.findUnique({
        where: { id },
        include: { user: { select: { id: true, name: true } } }
      });
      if (!provider) return sendApiError(res, 404, 'NOT_FOUND', 'Provider not found.');

      const oldStatus = provider.accountStatus;
      if (oldStatus === status) {
        return sendApiError(res, 400, 'NO_CHANGE', `Provider is already ${status}.`);
      }

      await prisma.provider.update({ where: { id }, data: { accountStatus: status } });
      invalidateServiceStatsCaches();

      // A blocked provider must lose its live sessions immediately, otherwise an
      // already-issued refresh token keeps minting access tokens until it expires
      // on its own. Best-effort: a revocation failure must not fail the block,
      // which is the security-critical half of this request.
      let revokedSessions = 0;
      if (status === 'BLOCKED') {
        try {
          revokedSessions = await revokeAllForUser(provider.user.id, 'ACCOUNT_BLOCKED');
        } catch (e) {
          console.error('[adminProviderStatus] session revocation failed:', e.message);
        }
      }

      // Notify the provider's user
      const statusLabel = { ACTIVE: 'reactivated', ON_HOLD: 'placed on hold', BLOCKED: 'blocked' }[status];
      await prisma.notification.create({
        data: {
          userId: provider.user.id,
          title: 'Account Status Updated',
          message: `Your provider account has been ${statusLabel}. Reason: ${String(reason).trim()}`,
          type: 'ACCOUNT'
        }
      });

      await writeAuditLog({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: `SET_PROVIDER_STATUS_${status}`,
        targetType: 'Provider',
        targetId: id,
        oldValue: { accountStatus: oldStatus },
        newValue: {
          accountStatus: status,
          reason: String(reason).trim(),
          revokedSessions
        },
        ip: req.ip
      });

      // Emit socket event so dashboards update live
      const io = req.app.get('socketio');
      if (io) {
        io.to(`user:${provider.user.id}`).emit('accountStatusChanged', { status, reason });
        // Cut the live connection too, so a blocked provider is not simply still
        // receiving realtime events until the tab is closed.
        if (status === 'BLOCKED' && revokedSessions > 0) {
          io.to(`user:${provider.user.id}`).emit('forceLogout', { reason: 'account_blocked' });
        }
      }

      return sendApiSuccess(res, 200, { providerId: id, accountStatus: status, revokedSessions });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to update provider account status', err.message);
    }
  }
};
