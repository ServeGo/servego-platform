import prisma from '../prisma/client.js';
import { creditWallet } from './walletService.js';

function disputeError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/** Run `fn` inside a transaction unless the caller already provided a transaction client. */
function withClientTransaction(client, fn) {
  if (client === prisma) {
    return prisma.$transaction(fn, { maxWait: 20000, timeout: 30000 });
  }
  return fn(client);
}

const DISPUTE_INCLUDE = {
  booking: {
    select: {
      id: true,
      serviceCategory: true,
      amount: true,
      status: true,
      bookingDate: true,
      locationAddress: true
    }
  },
  customer: { select: { id: true, name: true, email: true, phone: true } },
  provider: { select: { id: true, category: true, user: { select: { id: true, name: true, email: true } } } },
  messages: { orderBy: { createdAt: 'asc' } }
};

async function resolveProviderByUser(userId, client = prisma) {
  const provider = await client.provider.findUnique({ where: { userId }, select: { id: true } });
  return provider?.id || null;
}

/**
 * Raise a dispute against a booking. Both the customer and the assigned
 * provider may raise one (once per booking, while it is still open).
 */
export async function raiseDispute({ bookingId, userId, raisedBy, reason, description, evidence = [], client = prisma }) {
  if (!bookingId) throw disputeError('MISSING_FIELDS', 'Booking ID is required.');
  if (!reason) throw disputeError('MISSING_FIELDS', 'Dispute reason is required.');
  if (!description || String(description).trim().length < 10) {
    throw disputeError('SHORT_DESCRIPTION', 'Please describe the issue in at least 10 characters.');
  }
  if (!['CUSTOMER', 'PROVIDER'].includes(raisedBy)) {
    throw disputeError('INVALID_ACTOR', 'raisedBy must be CUSTOMER or PROVIDER.');
  }

  return withClientTransaction(client, async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw disputeError('BOOKING_NOT_FOUND', 'Booking not found.');

    if (raisedBy === 'CUSTOMER') {
      if (booking.customerId !== userId) throw disputeError('FORBIDDEN', 'You can only raise a dispute on your own booking.');
    } else {
      const providerId = await resolveProviderByUser(userId, tx);
      if (!providerId || providerId !== booking.providerId) throw disputeError('FORBIDDEN', 'You can only raise a dispute on your own booking.');
    }

    const existing = await tx.dispute.findFirst({
      where: { bookingId, status: { in: ['OPEN', 'IN_REVIEW'] } }
    });
    if (existing) throw disputeError('DUPLICATE_DISPUTE', 'An open dispute already exists for this booking.');

    return tx.dispute.create({
      data: {
        bookingId,
        customerId: booking.customerId,
        providerId: booking.providerId,
        raisedBy,
        reason,
        description: String(description).trim(),
        evidence: Array.isArray(evidence) ? evidence.filter(Boolean) : []
      },
      include: DISPUTE_INCLUDE
    });
  });
}

/** Customer or provider list their own disputes. */
export async function listMyDisputes(userId, role, client = prisma) {
  const where = {};
  if (role === 'customer') {
    where.customerId = userId;
  } else {
    const providerId = await resolveProviderByUser(userId, client);
    if (!providerId) return [];
    where.providerId = providerId;
  }
  return client.dispute.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: DISPUTE_INCLUDE
  });
}

/** Single dispute with access control (customer/provider scoped, admin full). */
export async function getDispute(id, userId, role, client = prisma) {
  const dispute = await client.dispute.findUnique({ where: { id }, include: DISPUTE_INCLUDE });
  if (!dispute) throw disputeError('NOT_FOUND', 'Dispute not found.');
  if (role === 'admin') return dispute;
  if (role === 'customer') {
    if (dispute.customerId !== userId) throw disputeError('FORBIDDEN', 'You cannot view this dispute.');
    return dispute;
  }
  const providerId = await resolveProviderByUser(userId, client);
  if (!providerId || dispute.providerId !== providerId) throw disputeError('FORBIDDEN', 'You cannot view this dispute.');
  return dispute;
}

/** Append a message to a dispute (customer / provider / admin). */
export async function addDisputeMessage({ disputeId, senderId, senderRole, message, client = prisma }) {
  if (!message || String(message).trim().length < 1) throw disputeError('EMPTY_MESSAGE', 'Message cannot be empty.');
  const msg = String(message).trim();
  if (msg.length > 4000) throw disputeError('MESSAGE_TOO_LONG', 'Message is too long.');

  return withClientTransaction(client, async (tx) => {
    const dispute = await tx.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw disputeError('NOT_FOUND', 'Dispute not found.');
    if (dispute.status === 'RESOLVED' || dispute.status === 'REJECTED') {
      throw disputeError('DISPUTE_CLOSED', 'This dispute is closed and can no longer receive messages.');
    }

    const created = await tx.disputeMessage.create({
      data: { disputeId, senderId, senderRole, message: msg }
    });

    // First party reply moves the dispute into review so the admin knows to act.
    if (dispute.status === 'OPEN' && senderRole !== 'admin') {
      await tx.dispute.update({ where: { id: disputeId }, data: { status: 'IN_REVIEW' } });
    }

    return created;
  });
}

/**
 * Admin resolves a dispute.
 *  - FULL_REFUND: refund the full booking amount to the customer wallet.
 *  - PARTIAL_REFUND: refund `refundAmount` (must be positive and <= amount).
 *  - NO_REFUND: close with no money movement.
 */
export async function resolveDispute({ disputeId, adminId, resolutionType, refundAmount = null, adminNote = null, client = prisma }) {
  if (!['FULL_REFUND', 'PARTIAL_REFUND', 'NO_REFUND'].includes(resolutionType)) {
    throw disputeError('INVALID_RESOLUTION', 'resolutionType must be FULL_REFUND, PARTIAL_REFUND or NO_REFUND.');
  }

  return withClientTransaction(client, async (tx) => {
    const dispute = await tx.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw disputeError('NOT_FOUND', 'Dispute not found.');
    if (dispute.status === 'RESOLVED' || dispute.status === 'REJECTED') {
      throw disputeError('ALREADY_RESOLVED', 'This dispute has already been closed.');
    }

    const bookingRow = await tx.booking.findUnique({ where: { id: dispute.bookingId }, select: { amount: true } });
    const bookingAmount = Number(bookingRow?.amount) || 0;
    let finalRefund = 0;
    if (resolutionType === 'FULL_REFUND') {
      finalRefund = bookingAmount > 0 ? bookingAmount : Number(refundAmount || 0);
    } else if (resolutionType === 'PARTIAL_REFUND') {
      finalRefund = Number(refundAmount || 0);
      if (finalRefund <= 0) throw disputeError('INVALID_REFUND', 'A partial refund amount must be provided.');
      if (bookingAmount > 0 && finalRefund > bookingAmount) {
        throw disputeError('REFUND_EXCEEDS_AMOUNT', 'Refund amount cannot exceed the booking amount.');
      }
    }

    if (finalRefund > 0) {
      await creditWallet({
        userId: dispute.customerId,
        amount: finalRefund,
        category: 'DISPUTE_REFUND',
        referenceType: 'DISPUTE',
        referenceId: disputeId,
        description: `Refund from dispute resolution (${resolutionType})`,
        client: tx
      });
    }

    return tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'RESOLVED',
        resolutionType,
        refundAmount: finalRefund > 0 ? finalRefund : null,
        adminNote: adminNote || null,
        resolvedBy: adminId,
        resolvedAt: new Date()
      },
      include: DISPUTE_INCLUDE
    });
  });
}

/** Admin rejects a dispute with no refund. */
export async function rejectDispute({ disputeId, adminId, adminNote = null, client = prisma }) {
  return withClientTransaction(client, async (tx) => {
    const dispute = await tx.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw disputeError('NOT_FOUND', 'Dispute not found.');
    if (dispute.status === 'RESOLVED' || dispute.status === 'REJECTED') {
      throw disputeError('ALREADY_RESOLVED', 'This dispute has already been closed.');
    }
    return tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'REJECTED',
        resolutionType: 'NO_REFUND',
        refundAmount: null,
        adminNote: adminNote || null,
        resolvedBy: adminId,
        resolvedAt: new Date()
      },
      include: DISPUTE_INCLUDE
    });
  });
}

/** Admin list with filters + pagination. */
export async function listAdminDisputes({ status = null, page = 1, limit = 25, client = prisma } = {}) {
  const where = status ? { status } : {};
  const take = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (Math.max(1, parseInt(page)) - 1) * take;
  const [disputes, total] = await Promise.all([
    client.dispute.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: DISPUTE_INCLUDE }),
    client.dispute.count({ where })
  ]);
  return {
    disputes,
    pagination: { page: parseInt(page), limit: take, total, pages: Math.ceil(total / take) }
  };
}

/** Admin aggregate stats for the disputes tab. */
export async function getDisputeStats(client = prisma) {
  const [byStatus, open, totalRefunded] = await Promise.all([
    client.dispute.groupBy({ by: ['status'], _count: { _all: true } }),
    client.dispute.count({ where: { status: { in: ['OPEN', 'IN_REVIEW'] } } }),
    client.dispute.aggregate({ where: { status: 'RESOLVED' }, _sum: { refundAmount: true } })
  ]);
  const statusCounts = {};
  for (const row of byStatus) statusCounts[row.status] = row._count._all;
  return {
    open,
    total: byStatus.reduce((sum, r) => sum + r._count._all, 0),
    byStatus: statusCounts,
    totalRefunded: totalRefunded._sum.refundAmount || 0
  };
}

export { DISPUTE_INCLUDE };
