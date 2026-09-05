import prisma from '../prisma/client.js';
import { recordJobCancelled, recordLeadOffered } from '../services/providerPerformanceService.js';
import {
  createBookingWithLead,
  acceptLeadForBooking,
  startBookingWork,
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
  notifyLeadCancelledByCustomer,
  notifyNoProviderFound,
  notifyProviderCooldown
} from '../services/notificationService.js';
import { enqueueJob, isQueueEnabled } from '../services/queue/queueService.js';
import { buildStatusHistory, isValidBookingTransition, normalizeBookingStatus } from '../utils/workflow.js';
import { canPerformAction } from '../utils/permissions.js';
import { writeAuditLog } from '../services/auditLogService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { bookingListItem } from '../utils/serializers.js';
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
  quotations: { orderBy: { createdAt: 'desc' }, take: 1 },
};

// List rows only render the service label — don't pull full Service rows
// (description, popularIssues JSON) onto every booking of the page. The full
// shape stays on the single-booking `getById` path.
//
// `events` is included as a lean, ordered audit trail so the customer tracking
// timeline can be rebuilt even for bookings whose `statusHistory` predates the
// feature (a single LEFT JOIN, not an N+1).
const BOOKING_LIST_INCLUDE = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  provider: {
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, avatar: true } }
    }
  },
  service: { select: { id: true, name: true } },
  quotations: { orderBy: { createdAt: 'desc' }, take: 1 },
  events: { orderBy: { createdAt: 'asc' }, select: { action: true, note: true, actorRole: true, createdAt: true } },
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

/**
 * Offered-count bookkeeping is derived analytics — it must never sit on the
 * customer's critical path. With queue workers enabled the increments are
 * drained as `performance` jobs; when the queue is disabled (dev/test) we fall
 * back to direct writes so behaviour is unchanged. Failures are logged, never
 * fatal — the booking transaction has already committed by this point.
 */
function trackLeadOffers(providerIds) {
  if (isQueueEnabled()) {
    for (const providerId of providerIds) {
      fireAndForget({ type: 'performance', payload: { action: 'leadOffered', providerId } });
    }
    return null;
  }
  return Promise.allSettled(providerIds.map((providerId) => recordLeadOffered(providerId))).then((results) => {
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('[BookingController] Lead-offered bookkeeping failed:', result.reason?.message);
      }
    }
  });
}

export const BookingController = {
  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 50, status, statuses, providerId, customerId, adminSearch } = req.query;
      const maxLimit = Math.min(100, Math.max(1, parseInt(limit)));

      // Accept a single `status` or a comma-separated `statuses` list (e.g.
      // `statuses=CONFIRMED,ONGOING` for grouped tabs). Both are normalized so
      // lowercase/aliased values from the UI resolve against the stored enum.
      const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED'];
      const normalizeStatus = (raw) => {
        const s = String(raw || '').trim().toUpperCase().replace('REVIEWED', 'COMPLETED');
        return BOOKING_STATUSES.includes(s) ? s : null;
      };

      const where = {};
      const statusList = [
        ...(status ? [normalizeStatus(status)] : []),
        ...(statuses ? String(statuses).split(',').map(normalizeStatus) : [])
      ].filter(Boolean);
      if (statusList.length === 1) where.status = statusList[0];
      else if (statusList.length > 1) where.status = { in: statusList };
      if (providerId) where.providerId = providerId;
      if (customerId) where.customerId = customerId;
      if (req.user.role === 'admin' && adminSearch) {
        const q = String(adminSearch).trim();
        where.OR = [
          { id: { contains: q, mode: 'insensitive' } },
          { customer: { name: { contains: q, mode: 'insensitive' } } },
          { provider: { user: { name: { contains: q, mode: 'insensitive' } } } }
        ];
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

      // Realtime-recovery sync: `?updatedAfter=<ISO timestamp>` returns only
      // rows touched after the client's lastSeen watermark (server time, never
      // the client clock). Bookings store an updatedAt on every mutation, so a
      // status/assignment change made while the socket was down is replayed.
      const updatedAfter = String(req.query.updatedAfter || '').trim();
      if (updatedAfter) {
        const ts = new Date(updatedAfter);
        if (!Number.isNaN(ts.getTime())) where.updatedAt = { gt: ts };
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
            include: BOOKING_LIST_INCLUDE,
            take: maxLimit + 1,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
          }),
          prisma.booking.count({ where })
        ]);

        const { items, nextCursor, hasMore } = sliceCursorPage(raw, maxLimit);
        return sendApiSuccess(res, 200, {
          bookings: items.map(bookingListItem),
          pagination: { total, nextCursor, hasMore }
        });
      }

      const skip = (Math.max(1, parseInt(page)) - 1) * maxLimit;

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          include: BOOKING_LIST_INCLUDE,
          skip,
          take: maxLimit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.booking.count({ where })
      ]);

      return sendApiSuccess(res, 200, {
        bookings: bookings.map(bookingListItem),
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
        // Real-time pushes are off the customer's critical path. The socket
        // emits happen within milliseconds, but the request does not wait for
        // them — the response returns as soon as the booking transaction
        // commits. Persistence is handled by the queue workers.
        void Promise.allSettled(
          (result.providers || []).map((provider) =>
            notifyNewLead(io, provider.user.id, buildLeadPayload(result.lead, result.booking, provider))
          )
        );
        io.to(`user:${actorId}`).emit('booking:created', { bookingId: result.booking.id, status: 'PENDING' });
      }
      scheduleLeadExpiry(result.lead, io);

      // Offered-count bookkeeping for every provider the request was broadcast
      // to — drained asynchronously by the queue.
      const offerTracking = trackLeadOffers((result.providers || []).map((p) => p.id));
      if (offerTracking) await offerTracking;

      // Decoupled side-effects — analytics and invoices are drained by queue
      // workers so the request returns before any slow work runs. No email is
      // sent for bookings (the product communicates in-app / over socket only).
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

      // Completion is now gated by the accepted quotation flow (customer
      // confirms the quotation → work starts) instead of a verification code.

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

      // ONGOING — provider starts work. The transition (CONFIRMED → ONGOING) is
      // enforced atomically inside startBookingWork; the controller never writes
      // booking.status directly.
      const started = await startBookingWork({
        bookingId: id,
        actorId: requesterId,
        actorRole: role,
        note: note || null
      });
      const updated = await prisma.booking.findUnique({ where: { id }, include: BOOKING_INCLUDE });

      fireAndForget({ type: 'performance', payload: { action: 'jobStarted', providerId: booking.providerId } });

      await notifyBookingStatusChanged(io, booking, 'ONGOING', provider?.userId);
      if (io) {
        io.to(`user:${booking.customerId}`).emit('booking:statusChanged', { bookingId: updated.id, status: 'ONGOING' });
        if (provider?.userId) io.to(`user:${provider.userId}`).emit('booking:statusChanged', { bookingId: updated.id, status: 'ONGOING' });
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

    await notifyBookingStatusChanged(io, booking, 'COMPLETED', provider?.userId);
    if (io) {
      io.to(`user:${booking.customerId}`).emit('booking:statusChanged', { bookingId: booking.id, status: 'COMPLETED' });
      if (provider?.userId) io.to(`user:${provider.userId}`).emit('booking:statusChanged', { bookingId: booking.id, status: 'COMPLETED' });
    }

    // Decoupled completion side-effects — analytics and final invoice snapshot
    // run in queue workers. No receipt email: the product is in-app only.
    fireAndForget({
      type: 'analytics',
      payload: {
        bookingsCompleted: 1,
        revenue: Number(result.earnings) + Number(result.commission),
        commission: Number(result.commission) || 0
      }
    });
    fireAndForget({ type: 'invoice', payload: { bookingId: booking.id } });

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
    // Idempotency: a booking that is already cancelled is a no-op. A second
    // click/retry returns the current row instead of re-running side effects.
    if (normalizeBookingStatus(booking.status) === 'CANCELLED') {
      const current = await prisma.booking.findUnique({ where: { id: booking.id }, include: BOOKING_INCLUDE });
      return sendApiSuccess(res, 200, current);
    }

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
          details: { cancelledBy: 'provider', reason: note || null },
          expectedProviderId: providerId
        });
        updated = await prisma.booking.findUnique({ where: { id: booking.id }, include: BOOKING_INCLUDE });
      }

      if (redistribution?.alreadyHandled) {
        // A concurrent cancel already re-pointed this lead — nothing left to do.
        return sendApiSuccess(res, 200, updated);
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
    let affectedProviders = [];
    if (lead) {
      cancelLeadExpiry(lead.id);
      const closed = await cancelOpenOffers({
        leadId: lead.id,
        reason: actorRole === 'CUSTOMER' ? 'CUSTOMER_CANCELLED' : 'ADMIN_CANCELLED'
      });
      affectedProviders = closed?.providerUserIds || [];
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'REJECTED', lastRejectReason: actorRole === 'CUSTOMER' ? 'CUSTOMER_CANCELLED' : 'ADMIN_CANCELLED' }
      });
    }
    const existingReason = await prisma.cancellationReason.findFirst({
      where: { bookingId: booking.id, actor: actorRole },
      select: { id: true }
    });
    if (!existingReason) {
      await prisma.cancellationReason.create({
        data: {
          bookingId: booking.id,
          leadId: lead?.id || null,
          actor: actorRole,
          actorId: requesterId,
          reason: note || (actorRole === 'CUSTOMER' ? 'Customer cancelled the booking' : 'Admin cancelled the booking')
        }
      });
    }

    const updated = await cancelBookingPlain(booking, requesterId, role, note);
    await notifyBookingStatusChanged(io, booking, 'CANCELLED', provider?.userId);
    if (io) {
      io.to(`user:${booking.customerId}`).emit('booking:cancelled', { bookingId: booking.id, status: 'CANCELLED' });
      if (provider?.userId) io.to(`user:${provider.userId}`).emit('booking:cancelled', { bookingId: booking.id, status: 'CANCELLED' });
      // Every provider still holding an open broadcast offer sees it closed in
      // realtime — same pattern as `accept` notifying losing providers. The
      // payload carries the CANCELLED booking, so the number stays stripped.
      await Promise.all(
        affectedProviders
          .filter((uid) => uid !== provider?.userId)
          .map((uid) => notifyLeadCancelledByCustomer(io, uid, buildLeadPayload(lead, updated)))
      );
    }
    // Admin override cancellation must land in the audit trail.
    if (actorRole === 'ADMIN') {
      await writeAuditLog({
        actorId: requesterId,
        actorRole: 'ADMIN',
        action: 'CANCEL_BOOKING_OVERRIDE',
        targetType: 'Booking',
        targetId: booking.id,
        oldValue: { status: booking.status, providerId: booking.providerId || null },
        newValue: { status: 'CANCELLED', reason: note || 'Admin cancelled the booking' },
        ip: req.ip
      });
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
  const transitioned = await prisma.booking.updateMany({
    where: { id: booking.id, status: { not: 'CANCELLED' } },
    data: {
      status: 'CANCELLED',
      statusHistory: newHistory,
      cancelledBy: requesterId,
      cancelledReason: note || null
    }
  });
  if (transitioned.count === 0) {
    // Already cancelled — idempotent no-op. Never duplicate the event/analytics.
    return prisma.booking.findUnique({ where: { id: booking.id }, include: BOOKING_INCLUDE });
  }
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
  return prisma.booking.findUnique({ where: { id: booking.id }, include: BOOKING_INCLUDE });
}
