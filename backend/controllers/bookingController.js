import prisma from '../prisma/client.js';
import { recordJobCancelled } from '../services/providerPerformanceService.js';
import {
  createBookingWithLead,
  acceptLeadForBooking,
  completeBooking,
  rejectLead,
  redistributeLead,
  cancelOpenOffers,
  buildLeadPayload
} from '../services/leadService.js';
import { scheduleLeadExpiry, cancelLeadExpiry } from '../services/leadExpiryService.js';
import {
  notifyBookingStatusChanged,
  notifyNewLead,
  notifyLeadAccepted,
  notifyLeadRejected,
  notifyLeadTransferred,
  notifyLeadCancelled,
  notifyNoProviderFound,
  notifyProviderCooldown,
  notifySubscriptionExpired,
  notifyRemainingLeadsLow
} from '../services/notificationService.js';
import { enqueueJob } from '../services/queue/queueService.js';
import { bookingRequestEmail, bookingCompletedEmail } from '../services/emailService.js';
import { buildStatusHistory, isValidBookingTransition, normalizeBookingStatus } from '../utils/workflow.js';
import { canPerformAction } from '../utils/permissions.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { parsePagination, offsetMeta, parseCursor, sliceCursorPage } from '../utils/pagination.js';
import {
  updateProviderLocation,
  getBookingTracking,
  getBookingLocationHistory,
  clearLocationHistory,
  markProviderOnTheWay,
  markProviderArrived,
  resetProviderPhase
} from '../services/trackingService.js';

const BOOKING_INCLUDE = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  provider: {
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, avatar: true } }
    }
  },
  service: true,
};

/**
 * Enqueue a side-effect job without blocking the request. Failures to enqueue
 * are logged and swallowed — the core booking state is already committed.
 */
function fireAndForget(job) {
  void enqueueJob(job).catch((err) => {
    console.error('[BookingController] Queue enqueue failed:', err.message);
  });
}

export const BookingController = {
  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 50, status, providerId, customerId, adminSearch } = req.query;
      const maxLimit = Math.min(100, Math.max(1, parseInt(limit)));

      const where = {};
      if (status) where.status = status;
      if (providerId) where.providerId = providerId;
      if (customerId) where.customerId = customerId;
      if (req.user.role === 'admin' && adminSearch) {
        where.id = { equals: String(adminSearch).trim() };
      }

      if (req.user.role === 'provider') {
        const provider = await prisma.provider.findFirst({
          where: { userId: req.user.id },
          select: { id: true }
        });
        // A provider account without a profile must never fall through to an
        // unfiltered query and receive every booking in the system.
        if (!provider) {
          return sendApiSuccess(res, 200, {
            bookings: [],
            pagination: { page: parseInt(page), limit: maxLimit, total: 0, pages: 0 }
          });
        }
        where.providerId = provider.id;
      } else if (req.user.role === 'customer') {
        where.customerId = req.user.id;
      }

      const cursorToken = String(req.query.cursor || '').trim();
      const cursorMode = cursorToken || String(req.query.mode || '').toLowerCase() === 'cursor';

      // Cursor (keyset) mode for high-volume feeds: stable ordering across
      // inserts. Returns `nextCursor` when another page exists. The first page
      // is fetched with `?mode=cursor&limit=N` (no cursor yet).
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
          prisma.booking.findMany({
            where: { ...where, ...cursorWhere },
            include: BOOKING_INCLUDE,
            take: maxLimit + 1,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
          }),
          prisma.booking.count({ where })
        ]);

        const { items, nextCursor, hasMore } = sliceCursorPage(raw, maxLimit);
        return sendApiSuccess(res, 200, { bookings: items, pagination: { total, nextCursor, hasMore } });
      }

      const skip = (Math.max(1, parseInt(page)) - 1) * maxLimit;

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          include: BOOKING_INCLUDE,
          skip,
          take: maxLimit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.booking.count({ where })
      ]);

      return sendApiSuccess(res, 200, {
        bookings,
        pagination: offsetMeta(total, parseInt(page), maxLimit)
      });
    } catch (err) {
      console.error('[BookingController.getAll] Error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to retrieve bookings',
        process.env.NODE_ENV !== 'production' ? err.message : undefined);
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const booking = await prisma.booking.findUnique({ 
        where: { id }, 
        include: BOOKING_INCLUDE 
      });
      
      if (!booking) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Booking not found.');
      }

      if (req.user.role === 'customer' && booking.customerId !== req.user.id) {
        return sendApiError(res, 403, 'FORBIDDEN', 'You can only view your own bookings.');
      }
      
      if (req.user.role === 'provider') {
        const provider = await prisma.provider.findFirst({
          where: { userId: req.user.id },
          select: { id: true }
        });
        if (!provider || booking.providerId !== provider.id) {
          return sendApiError(res, 403, 'FORBIDDEN', 'You can only view your assigned bookings.');
        }
      }

      return sendApiSuccess(res, 200, booking);
    } catch (err) {
      console.error('[BookingController.getById] Error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch booking details',
        process.env.NODE_ENV !== 'production' ? err.message : undefined);
    }
  },

  create: async (req, res) => {
    try {
      const bookingData = req.body;
      const actorId = req.user.id;
      const actorRole = req.user.role;

      if (actorRole !== 'customer' && actorRole !== 'admin') {
        return sendApiError(res, 403, 'FORBIDDEN', 'Only customers can create bookings.');
      }
      if (actorRole === 'customer' && bookingData.customerId && bookingData.customerId !== actorId) {
        return sendApiError(res, 403, 'FORBIDDEN', 'You can only create bookings for yourself.');
      }
      if (!bookingData.serviceCategory) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Missing required field: serviceCategory.');
      }

      const customerId = actorRole === 'customer' ? actorId : bookingData.customerId;
      if (!customerId) return sendApiError(res, 400, 'MISSING_FIELDS', 'Missing required field: customerId.');

      const customer = await prisma.user.findUnique({
        where: { id: customerId },
        select: { id: true, name: true, email: true, latitude: true, longitude: true }
      });
      if (!customer) return sendApiError(res, 404, 'NOT_FOUND', 'Customer not found.');

      // One booking at a time — customer
      const customerActiveBooking = await prisma.booking.findFirst({
        where: { customerId, status: { in: ['PENDING', 'CONFIRMED', 'ONGOING'] } },
        select: { id: true }
      });
      if (customerActiveBooking) {
        return sendApiError(res, 409, 'CUSTOMER_BUSY', 'You already have an active booking. Please complete or cancel it before booking another.');
      }

      const result = await createBookingWithLead({
        customerId,
        preferredProviderId: bookingData.providerId || null,
        serviceId: bookingData.serviceId || null,
        serviceCategory: bookingData.serviceCategory,
        amount: bookingData.amount,
        locationAddress: bookingData.locationAddress || '',
        city: bookingData.city || 'Hyderabad',
        instructions: bookingData.instructions || '',
        notes: bookingData.notes || null,
        // Exact service location picked on the map is authoritative; fall back
        // to the customer's profile coordinates for legacy/admin-created rows.
        serviceLatitude: bookingData.serviceLatitude != null ? Number(bookingData.serviceLatitude) : null,
        serviceLongitude: bookingData.serviceLongitude != null ? Number(bookingData.serviceLongitude) : null,
        customerLat: bookingData.serviceLatitude != null ? Number(bookingData.serviceLatitude) : customer.latitude ?? null,
        customerLng: bookingData.serviceLongitude != null ? Number(bookingData.serviceLongitude) : customer.longitude ?? null
      });

      const io = req.app.get('socketio');
      if (io) {
        // Broadcast the request to every eligible subscribed provider at once.
        // Parallel: each notification is independent; serial round trips here
        // made the request blow past the 30s timeout.
        await Promise.all(
          (result.providers || []).map((provider) =>
            notifyNewLead(io, provider.user.id, buildLeadPayload(result.lead, result.booking, provider))
          )
        );
        io.to(`user:${actorId}`).emit('booking:created', { bookingId: result.booking.id, status: 'PENDING' });
      }
      scheduleLeadExpiry(result.lead, io);

      // Decoupled side-effects — emails, analytics and invoices are drained by
      // queue workers so the request returns before any slow work runs.
      if (customer.email) {
        fireAndForget({
          type: 'email',
          payload: bookingRequestEmail({
            customerName: customer.name,
            bookingId: result.booking.id,
            serviceCategory: result.booking.serviceCategory,
            amount: result.booking.amount
          })
        });
      }
      fireAndForget({ type: 'analytics', payload: { bookingsCreated: 1, leadsCreated: 1 } });
      fireAndForget({ type: 'invoice', payload: { bookingId: result.booking.id } });

      return sendApiSuccess(res, 201, {
        booking: result.booking,
        lead: buildLeadPayload(result.lead, result.booking, result.provider)
      });
    } catch (err) {
      console.error('[BookingController.create] Error:', err.message, err.stack);
      const code = err.code && err.code !== 'INTERNAL_ERROR' ? err.code : 'INTERNAL_ERROR';
      const isClientError = code !== 'INTERNAL_ERROR';
      return sendApiError(res, isClientError ? 409 : 500, code,
        isClientError ? err.message : 'Failed to create booking.',
        process.env.NODE_ENV !== 'production' && !isClientError ? err.message : undefined);
    }
  },

  updateStatus: async (req, res) => {
    try {
      const role = req.user.role;
      const requesterId = req.user.id;
      const { id } = req.params;
      const { status, note } = req.body;

      if (!status) return sendApiError(res, 400, 'MISSING_FIELDS', 'A valid status string is required.');

      const updatedStatus = normalizeBookingStatus(status);
      
      if (!['PENDING', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(updatedStatus)) {
        return sendApiError(res, 400, 'INVALID_STATUS', 'Invalid booking status provided.');
      }


      const booking = await prisma.booking.findUnique({ where: { id } });
      if (!booking) return sendApiError(res, 404, 'NOT_FOUND', 'Booking not found.');

      const currentStatus = normalizeBookingStatus(booking.status);
      
      if (currentStatus === updatedStatus) {
        return sendApiError(res, 400, 'NO_CHANGE', 'Booking is already in this status.');
      }

      const provider = await prisma.provider.findUnique({ 
        where: { id: booking.providerId }, 
        select: { userId: true, accountStatus: true }
      });

      if (role === 'provider' && provider?.accountStatus === 'BLOCKED') {
        return sendApiError(res, 403, 'PROVIDER_BLOCKED', 'Blocked providers cannot update bookings.');
      }

      const canUpdate = canPerformAction({
        role,
        action: 'update_booking_status',
        context: {
          requesterId,
          assignedProviderUserId: provider?.userId,
          customerId: booking.customerId,
          currentStatus,
          nextStatus: updatedStatus
        }
      }) && isValidBookingTransition(currentStatus, updatedStatus);

      if (!canUpdate) return sendApiError(res, 403, 'FORBIDDEN', 'You are not allowed to perform this status transition.');

      // Verification code check: ONGOING -> COMPLETED requires customer's 4-digit code.
      if (currentStatus === 'ONGOING' && updatedStatus === 'COMPLETED') {
        const { verificationCode } = req.body;
        if (!verificationCode) {
          return sendApiError(res, 400, 'MISSING_FIELDS', 'Verification code is required to complete the job. Ask the customer for their 4-digit code.');
        }
        const customerUser = await prisma.user.findUnique({
          where: { id: booking.customerId },
          select: { verificationCode: true }
        });
        if (!customerUser || String(verificationCode).trim() !== String(customerUser.verificationCode).trim()) {
          return sendApiError(res, 400, 'INVALID_CODE', 'Invalid verification code. Please ask the customer for the correct 4-digit code.');
        }
      }

      const io = req.app.get('socketio');

      if (updatedStatus === 'CONFIRMED') {
        return handleAccept(req, res, { booking, provider, note, io });
      }
      if (updatedStatus === 'COMPLETED') {
        return handleCompletion(req, res, { booking, provider, note, io });
      }
      if (updatedStatus === 'CANCELLED') {
        return handleCancellation(req, res, { booking, provider, requesterId, role, note, io });
      }

      // ONGOING — provider starts work: record the start time + performance metric.
      const newHistory = buildStatusHistory(booking.statusHistory, updatedStatus, note);
      const updated = await prisma.booking.update({
        where: { id },
        data: {
          status: updatedStatus,
          startedAt: updatedStatus === 'ONGOING' ? new Date() : null,
          statusHistory: newHistory
        },
        include: BOOKING_INCLUDE
      });

      if (updatedStatus === 'ONGOING') {
        fireAndForget({ type: 'performance', payload: { action: 'jobStarted', providerId: booking.providerId } });
      }

      await prisma.bookingEvent.create({
        data: {
          bookingId: id,
          actorId: requesterId,
          actorRole: role,
          action: `STATUS_${updatedStatus}`,
          note: note || null
        }
      });

      await notifyBookingStatusChanged(io, booking, updatedStatus, provider?.userId);
      if (io) {
        io.to(`user:${booking.customerId}`).emit('booking:statusChanged', { bookingId: updated.id, status: updatedStatus });
        if (provider?.userId) io.to(`user:${provider.userId}`).emit('booking:statusChanged', { bookingId: updated.id, status: updatedStatus });
      }

      return sendApiSuccess(res, 200, updated);
    } catch (err) {
      console.error('[BookingController.updateStatus] Error:', err);
      const code = err.code && err.code !== 'INTERNAL_ERROR' ? err.code : 'INTERNAL_ERROR';
      return sendApiError(res, code === 'INTERNAL_ERROR' ? 500 : 409, code,
        code === 'INTERNAL_ERROR' ? 'Failed to update booking status' : err.message,
        process.env.NODE_ENV !== 'production' && code === 'INTERNAL_ERROR' ? err.message : undefined);
    }
  },

  transition: (status) => async (req, res) => {
    // Canonical action routes deliberately do not accept a client-selected status.
    if (status === 'CANCELLED' && !String(req.body?.reason || req.body?.note || '').trim()) {
      return sendApiError(res, 400, 'MISSING_FIELDS', 'A cancellation reason is required.');
    }
    if (status === 'CANCELLED') req.body = { ...(req.body || {}), note: req.body.reason || req.body.note };
    req.body = { ...(req.body || {}), status };
    return BookingController.updateStatus(req, res);
  },

  // REST fallback for provider location pings (primary path is the socket).
  updateLocation: async (req, res) => {
    try {
      const result = await updateProviderLocation({
        bookingId: req.params.id,
        providerUserId: req.user.id,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        io: req.app.get('socketio')
      });
      return sendApiSuccess(res, 200, result.payload);
    } catch (err) {
      return sendApiError(res, 400, err.code || 'INTERNAL_ERROR', err.message,
        process.env.NODE_ENV !== 'production' && !err.code ? err.message : undefined);
    }
  },

  getTracking: async (req, res) => {
    try {
      const tracking = await getBookingTracking({
        bookingId: req.params.id,
        userId: req.user.id,
        role: req.user.role
      });
      return sendApiSuccess(res, 200, tracking);
    } catch (err) {
      return sendApiError(res, err.code === 'BOOKING_NOT_FOUND' ? 404 : 403, err.code || 'INTERNAL_ERROR', err.message,
        process.env.NODE_ENV !== 'production' && !err.code ? err.message : undefined);
    }
  },

  // Dispatch lifecycle: provider signals they are heading to the customer.
  onTheWay: async (req, res) => {
    try {
      const result = await markProviderOnTheWay({
        bookingId: req.params.id,
        providerUserId: req.user.id,
        io: req.app.get('socketio')
      });
      return sendApiSuccess(res, 200, result.payload);
    } catch (err) {
      return sendApiError(res, 400, err.code || 'INTERNAL_ERROR', err.message,
        process.env.NODE_ENV !== 'production' && !err.code ? err.message : undefined);
    }
  },

  // Dispatch lifecycle: provider arrived at the service location.
  arrived: async (req, res) => {
    try {
      const result = await markProviderArrived({
        bookingId: req.params.id,
        providerUserId: req.user.id,
        io: req.app.get('socketio')
      });
      return sendApiSuccess(res, 200, result.payload);
    } catch (err) {
      return sendApiError(res, 400, err.code || 'INTERNAL_ERROR', err.message,
        process.env.NODE_ENV !== 'production' && !err.code ? err.message : undefined);
    }
  },

  getTrackHistory: async (req, res) => {
    try {
      const history = await getBookingLocationHistory({
        bookingId: req.params.id,
        userId: req.user.id,
        role: req.user.role,
        limit: req.query.limit
      });
      return sendApiSuccess(res, 200, history);
    } catch (err) {
      return sendApiError(res, err.code === 'BOOKING_NOT_FOUND' ? 404 : 403, err.code || 'INTERNAL_ERROR', err.message,
        process.env.NODE_ENV !== 'production' && !err.code ? err.message : undefined);
    }
  },

  getMessages: async (req, res) => {
    try {
      const { id } = req.params;
      const booking = await prisma.booking.findUnique({ where: { id }, select: { customerId: true, providerId: true, messages: true } });
      if (!booking) return sendApiError(res, 404, 'NOT_FOUND', 'Booking not found.');
      if (req.user.role === 'customer' && booking.customerId !== req.user.id) return sendApiError(res, 403, 'FORBIDDEN', 'You can only view your own booking messages.');
      if (req.user.role === 'provider') {
        const provider = await prisma.provider.findUnique({ where: { userId: req.user.id }, select: { id: true } });
        if (!provider || provider.id !== booking.providerId) return sendApiError(res, 403, 'FORBIDDEN', 'You can only view messages for assigned bookings.');
      }
      return sendApiSuccess(res, 200, Array.isArray(booking.messages) ? booking.messages : []);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch booking messages', err.message);
    }
  },

  getTimeline: async (req, res) => {
    try {
      const { id } = req.params;
      const booking = await prisma.booking.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          statusHistory: true,
          serviceCategory: true,
          createdAt: true,
          customer: { select: { id: true, name: true, email: true } },
          provider: { include: { user: { select: { id: true, name: true } } } },
          events: { orderBy: { createdAt: 'asc' } }
        }
      });
      if (!booking) return sendApiError(res, 404, 'NOT_FOUND', 'Booking not found.');
      return sendApiSuccess(res, 200, {
        bookingId: booking.id,
        currentStatus: booking.status,
        serviceCategory: booking.serviceCategory,
        createdAt: booking.createdAt,
        customer: booking.customer,
        provider: booking.provider?.user,
        timeline: booking.events
      });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch booking timeline', err.message);
    }
  },

  addMessage: async (req, res) => {
    try {
      const { id } = req.params;
      const { text } = req.body;
      const senderId = req.user.id;
      const senderName = req.user.email?.split('@')[0] || 'User';
      const senderRole = req.user.role;

      if (!text || !text.trim()) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Message text is required.');
      }

      if (text.length > 2000) {
        return sendApiError(res, 400, 'MESSAGE_TOO_LONG', 'Message text cannot exceed 2000 characters.');
      }

      const booking = await prisma.booking.findUnique({ where: { id } });
      if (!booking) return sendApiError(res, 404, 'NOT_FOUND', 'Booking not found.');

      if (req.user.role === 'customer' && booking.customerId !== req.user.id) {
        return sendApiError(res, 403, 'FORBIDDEN', 'You can only send messages on your own bookings.');
      }
      if (req.user.role === 'provider') {
        const provider = await prisma.provider.findFirst({
          where: { userId: req.user.id },
          select: { id: true }
        });
        if (!provider || booking.providerId !== provider.id) {
          return sendApiError(res, 403, 'FORBIDDEN', 'You can only send messages on your assigned bookings.');
        }
      }

      const messageObj = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        senderId,
        senderName,
        senderRole,
        text: text.trim(),
        timestamp: new Date().toISOString()
      };

      const updated = await prisma.booking.update({
        where: { id },
        data: { messages: [...(booking.messages || []), messageObj] },
        include: BOOKING_INCLUDE
      });

      const io = req.app.get('socketio');
      if (io) {
        io.to(`booking:${id}`).emit('chatMessageReceived', { bookingId: id, message: messageObj });
        // Use the already-fetched updated booking (includes provider via BOOKING_INCLUDE)
        const otherPartyId = req.user.role === 'customer'
          ? updated?.provider?.user?.id
          : booking.customerId;
        if (otherPartyId) {
          io.to(`user:${otherPartyId}`).emit('bookingMessage', { bookingId: id, message: messageObj });
          io.to(`user:${otherPartyId}`).emit('booking:messageCreated', { bookingId: id, messageId: messageObj.id });
        }
      }

      return sendApiSuccess(res, 201, updated);
    } catch (err) {
      console.error('[BookingController.addMessage] Error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to send message',
        process.env.NODE_ENV !== 'production' ? err.message : undefined);
    }
  }
};

// ============================================================
// Lead-aware lifecycle handlers
// ============================================================

async function handleAccept(req, res, { booking, provider, io }) {
  try {
    const result = await acceptLeadForBooking({ bookingId: booking.id, providerId: booking.providerId });
    if (result.lead) cancelLeadExpiry(result.lead.id);

    const updated = await prisma.booking.findUnique({ where: { id: booking.id }, include: BOOKING_INCLUDE });
    const leadPayload = result.lead ? buildLeadPayload(result.lead, updated) : null;

    if (result.lead) await notifyLeadAccepted(io, booking.customerId, leadPayload);
    await notifyBookingStatusChanged(io, booking, 'CONFIRMED', provider?.userId);
    if (io) {
      io.to(`user:${booking.customerId}`).emit('booking:statusChanged', { bookingId: booking.id, status: 'CONFIRMED' });
      if (provider?.userId) io.to(`user:${provider.userId}`).emit('booking:statusChanged', { bookingId: booking.id, status: 'CONFIRMED' });
      // Auto-cancel the remaining offers — tell every losing provider.
      for (const loser of result.cancelledProviders || []) {
        await notifyLeadCancelled(io, loser.userId, leadPayload);
      }
    }

    return sendApiSuccess(res, 200, updated);
  } catch (err) {
    const code = err.code && err.code !== 'INTERNAL_ERROR' ? err.code : 'INTERNAL_ERROR';
    return sendApiError(res, code === 'INTERNAL_ERROR' ? 500 : 409, code,
      code === 'INTERNAL_ERROR' ? 'Failed to accept booking.' : err.message,
      process.env.NODE_ENV !== 'production' && code === 'INTERNAL_ERROR' ? err.message : undefined);
  }
}

async function handleCompletion(req, res, { booking, provider, io }) {
  try {
    const result = await completeBooking({ bookingId: booking.id, providerId: booking.providerId });
    void clearLocationHistory({ bookingId: booking.id }).catch((err) => {
      console.error('[BookingController] Location history cleanup failed:', err.message);
    });
    void resetProviderPhase(booking.id).catch((err) => {
      console.error('[BookingController] Provider phase reset failed:', err.message);
    });

    if (result.promotion && provider?.userId && io) {
      io.to(`user:${provider.userId}`).emit('promotion', { promotion: result.promotion });
    }
    if (provider?.userId) {
      const subPayload = { remainingLeads: result.subscription.remainingLeads };
      if (result.subscription.justExpired) {
        await notifySubscriptionExpired(io, provider.userId, subPayload);
      } else if (result.subscription.lowLeads) {
        await notifyRemainingLeadsLow(io, provider.userId, subPayload);
      }
    }

    await notifyBookingStatusChanged(io, booking, 'COMPLETED', provider?.userId);
    if (io) {
      io.to(`user:${booking.customerId}`).emit('booking:statusChanged', { bookingId: booking.id, status: 'COMPLETED' });
      if (provider?.userId) io.to(`user:${provider.userId}`).emit('booking:statusChanged', { bookingId: booking.id, status: 'COMPLETED' });
    }

    // Decoupled completion side-effects — analytics, final invoice snapshot and
    // the receipt email all run in queue workers.
    fireAndForget({
      type: 'analytics',
      payload: {
        bookingsCompleted: 1,
        revenue: Number(result.earnings) + Number(result.commission),
        commission: Number(result.commission) || 0
      }
    });
    fireAndForget({ type: 'invoice', payload: { bookingId: booking.id } });
    if (result.booking?.customer?.email) {
      fireAndForget({
        type: 'email',
        payload: bookingCompletedEmail({
          customerName: result.booking.customer.name,
          bookingId: booking.id,
          serviceCategory: booking.serviceCategory,
          amount: result.booking.amount
        })
      });
    }

    return sendApiSuccess(res, 200, result.booking);
  } catch (err) {
    const code = err.code && err.code !== 'INTERNAL_ERROR' ? err.code : 'INTERNAL_ERROR';
    return sendApiError(res, code === 'INTERNAL_ERROR' ? 500 : 409, code,
      code === 'INTERNAL_ERROR' ? 'Failed to complete booking.' : err.message,
      process.env.NODE_ENV !== 'production' && code === 'INTERNAL_ERROR' ? err.message : undefined);
  }
}

async function handleCancellation(req, res, { booking, provider, requesterId, role, note, io }) {
  try {
    const providerId = booking.providerId;
    const actorRole = role === 'provider' ? 'PROVIDER' : role === 'admin' ? 'ADMIN' : 'CUSTOMER';
    const lead = await prisma.lead.findUnique({ where: { bookingId: booking.id } });

    void resetProviderPhase(booking.id).catch((err) => {
      console.error('[BookingController] Provider phase reset failed:', err.message);
    });

    // Provider declined a PENDING booking — withdraw their own offer. Other
    // providers offered the same request keep their open offers.
    if (actorRole === 'PROVIDER' && booking.status === 'PENDING') {
      if (lead) {
        const rejection = await rejectLead({ leadId: lead.id, providerId, reason: note || 'PROVIDER_DECLINED' });
        const updated = await prisma.booking.findUnique({ where: { id: booking.id }, include: BOOKING_INCLUDE });

        cancelLeadExpiry(rejection.lead?.id);
        if (rejection.settled) {
          await notifyBookingStatusChanged(io, booking, 'CANCELLED', provider?.userId);
          await notifyNoProviderFound(io, booking.customerId, buildLeadPayload(rejection.lead, updated));
          if (io) {
            io.to(`user:${booking.customerId}`).emit('booking:cancelled', { bookingId: booking.id, status: 'CANCELLED' });
            if (provider?.userId) io.to(`user:${provider.userId}`).emit('booking:cancelled', { bookingId: booking.id, status: 'CANCELLED' });
          }
        }
        return sendApiSuccess(res, 200, updated);
      }

      // Legacy booking without a lead — plain cancellation.
      const updated = await cancelBookingPlain(booking, requesterId, role, note);
      await notifyBookingStatusChanged(io, booking, 'CANCELLED', provider?.userId);
      return sendApiSuccess(res, 200, updated);
    }

    // Provider cancelled a CONFIRMED / ONGOING booking — cooldown + reassign when possible.
    if (actorRole === 'PROVIDER') {
      const cooldown = await recordJobCancelled(providerId, requesterId, note || 'PROVIDER_CANCELLED', {
        bookingId: booking.id,
        leadId: lead?.id || null
      });

      let redistribution = null;
      let updated = null;
      if (booking.status === 'CONFIRMED' && lead) {
        redistribution = await redistributeLead({
          leadId: lead.id,
          reason: 'PROVIDER_CANCELLED',
          details: { cancelledBy: 'provider', reason: note || null }
        });
        updated = await prisma.booking.findUnique({ where: { id: booking.id }, include: BOOKING_INCLUDE });
      }

      if (!updated) {
        updated = await cancelBookingPlain(booking, requesterId, role, note);
      }

      if (cooldown.cooldownTriggered && provider?.userId) {
        await notifyProviderCooldown(io, provider.userId, { cooldownUntil: cooldown.cooldownUntil });
      }

      if (redistribution?.reassigned && redistribution.nextProvider) {
        scheduleLeadExpiry(redistribution.lead, io);
        const payload = buildLeadPayload(redistribution.lead, updated, redistribution.nextProvider);
        await notifyLeadRejected(io, booking.customerId, payload);
        await notifyLeadTransferred(io, redistribution.nextProvider.user?.id, payload);
        return sendApiSuccess(res, 200, updated);
      }

      if (redistribution?.settled) {
        await notifyNoProviderFound(io, booking.customerId, buildLeadPayload(redistribution.lead ?? null, updated));
      }
      await notifyBookingStatusChanged(io, booking, 'CANCELLED', provider?.userId);
      if (io) {
        io.to(`user:${booking.customerId}`).emit('booking:cancelled', { bookingId: booking.id, status: 'CANCELLED' });
        if (provider?.userId) io.to(`user:${provider.userId}`).emit('booking:cancelled', { bookingId: booking.id, status: 'CANCELLED' });
      }
      return sendApiSuccess(res, 200, updated);
    }

    // Customer / Admin cancellation.
    if (lead) {
      cancelLeadExpiry(lead.id);
      await cancelOpenOffers({
        leadId: lead.id,
        reason: actorRole === 'CUSTOMER' ? 'CUSTOMER_CANCELLED' : 'ADMIN_CANCELLED'
      });
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'REJECTED', lastRejectReason: actorRole === 'CUSTOMER' ? 'CUSTOMER_CANCELLED' : 'ADMIN_CANCELLED' }
      });
    }
    await prisma.cancellationReason.create({
      data: {
        bookingId: booking.id,
        leadId: lead?.id || null,
        actor: actorRole,
        actorId: requesterId,
        reason: note || (actorRole === 'CUSTOMER' ? 'Customer cancelled the booking' : 'Admin cancelled the booking')
      }
    });

    const updated = await cancelBookingPlain(booking, requesterId, role, note);
    await notifyBookingStatusChanged(io, booking, 'CANCELLED', provider?.userId);
    if (io) {
      io.to(`user:${booking.customerId}`).emit('booking:cancelled', { bookingId: booking.id, status: 'CANCELLED' });
      if (provider?.userId) io.to(`user:${provider.userId}`).emit('booking:cancelled', { bookingId: booking.id, status: 'CANCELLED' });
    }
    return sendApiSuccess(res, 200, updated);
  } catch (err) {
    console.error('[BookingController.handleCancellation] Error:', err);
    const code = err.code && err.code !== 'INTERNAL_ERROR' ? err.code : 'INTERNAL_ERROR';
    return sendApiError(res, code === 'INTERNAL_ERROR' ? 500 : 409, code,
      code === 'INTERNAL_ERROR' ? 'Failed to cancel booking.' : err.message,
      process.env.NODE_ENV !== 'production' && code === 'INTERNAL_ERROR' ? err.message : undefined);
  }
}

async function cancelBookingPlain(booking, requesterId, role, note) {
  const newHistory = buildStatusHistory(booking.statusHistory, 'CANCELLED', note);
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: 'CANCELLED',
      statusHistory: newHistory,
      cancelledBy: requesterId,
      cancelledReason: note || null
    },
    include: BOOKING_INCLUDE
  });
  await prisma.bookingEvent.create({
    data: {
      bookingId: booking.id,
      actorId: requesterId,
      actorRole: role,
      action: 'STATUS_CANCELLED',
      note: note || null
    }
  });
  fireAndForget({ type: 'analytics', payload: { bookingsCancelled: 1 } });
  return updated;
}
