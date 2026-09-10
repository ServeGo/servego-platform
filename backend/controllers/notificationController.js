import prisma from '../prisma/client.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { parseCursor, sliceCursorPage } from '../utils/pagination.js';

export const NotificationController = {
  getAll: async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
      const where = req.user.role === 'admin' ? {} : { userId: req.user.id };

      // Realtime-recovery sync: `?after=<id|ISO timestamp>` returns only rows
      // newer than the client's lastSeen watermark. Accepts either a
      // notification id (keyset on the id column) or an ISO timestamp (filter
      // on createdAt), so the client never needs its own clock.
      const after = String(req.query.after || '').trim();
      const afterWhere = after
        ? (Number.isNaN(Date.parse(after))
            ? { id: { gt: after } }
            : { createdAt: { gt: new Date(after) } })
        : {};

      const cursorToken = String(req.query.cursor || '').trim();
      const cursorMode = cursorToken || String(req.query.mode || '').toLowerCase() === 'cursor';

      // Cursor (keyset) mode — opt-in. Backward-compatible: without `cursor`
      // or `mode=cursor` the endpoint keeps returning a plain array.
      if (cursorMode) {
        const cursor = cursorToken ? parseCursor(cursorToken) : null;
        if (cursorToken && !cursor) {
          return sendApiError(res, 400, 'INVALID_CURSOR', 'Invalid pagination cursor.');
        }
        const cursorWhere = cursor
          ? (cursor.date
              ? { OR: [{ createdAt: { lt: cursor.date } }, { createdAt: cursor.date, id: { lt: cursor.id } }] }
              : { id: { lt: cursor.id } })
          : {};

        const [raw, total] = await Promise.all([
          prisma.notification.findMany({
            where: { ...where, ...afterWhere, ...cursorWhere },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: limit + 1
          }),
          prisma.notification.count({ where: { ...where, ...afterWhere } })
        ]);

        const { items, nextCursor, hasMore } = sliceCursorPage(raw, limit);
        return sendApiSuccess(res, 200, { notifications: items, pagination: { total, nextCursor, hasMore } });
      }

      const notifications = await prisma.notification.findMany({
        where: { ...where, ...afterWhere },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
      return sendApiSuccess(res, 200, notifications);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch notifications', err.message);
    }
  },

  create: async (req, res) => {
    try {
      const { userId, title, message, type } = req.body;
      if (req.user.role !== 'admin' && userId !== req.user.id) {
        return sendApiError(res, 403, 'FORBIDDEN', 'You can only create notifications for yourself.');
      }
      if (!userId || !title || !message) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Missing required fields: userId, title, message.');
      }
      const notif = await prisma.notification.create({
        data: { userId, title, message, type: type || 'SYSTEM', isRead: false }
      });
      const io = req.app?.get('socketio');
      if (io) io.to(`user:${userId}`).emit('notification:new', { notificationId: notif.id, type: notif.type });
      return sendApiSuccess(res, 201, notif);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to create notification', err.message);
    }
  },

  read: async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await prisma.notification.findUnique({ where: { id }, select: { userId: true } });
      if (!existing) return sendApiError(res, 404, 'NOT_FOUND', 'Notification not found.');
      if (req.user.role !== 'admin' && existing.userId !== req.user.id) return sendApiError(res, 403, 'FORBIDDEN', 'You can only update your own notifications.');
      const notif = await prisma.notification.update({ where: { id }, data: { isRead: true } });
      return sendApiSuccess(res, 200, notif);
    } catch (err) {
      if (err.code === 'P2025') return sendApiError(res, 404, 'NOT_FOUND', 'Notification not found.');
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to mark notification as read', err.message);
    }
  },

  clearAll: async (req, res) => {
    try {
      const where = req.user.role === 'admin' ? {} : { userId: req.user.id };
      await prisma.notification.deleteMany({ where });
      return sendApiSuccess(res, 200, { message: 'Notifications cleared.' });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to clear notifications', err.message);
    }
  },

  readAll: async (req, res) => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user.id, isRead: false },
        data: { isRead: true }
      });
      return sendApiSuccess(res, 200, { message: 'All notifications marked as read.' });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to mark all notifications as read', err.message);
    }
  }
};
