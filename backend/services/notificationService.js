import prisma from '../prisma/client.js';

/**
 * Create a notification for a user
 */
export async function createNotification(userId, title, message, type = 'SYSTEM') {
  try {
    const notification = await prisma.notification.create({
      data: { userId, title, message, type, isRead: false }
    });
    return notification;
  } catch (err) {
    console.error(`[NotificationService] Failed to create notification for user ${userId}:`, err.message);
    return null;
  }
}

/**
 * Emit notification to user's room
 */
function emitToUserRoom(io, userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
    if (event === 'notification') io.to(`user:${userId}`).emit('notification:new', { notificationId: data?.id, type: data?.type });
  }
}

/**
 * Notify about booking status change
 */
export async function notifyBookingStatusChanged(io, booking, updatedStatus, providerUserId) {
  const notifications = [];

  const customerNotif = await createNotification(
    booking.customerId,
    'Booking Status Updated',
    `Your booking for ${booking.serviceCategory} has been updated to "${updatedStatus}".`,
    'BOOKING'
  );
  notifications.push(customerNotif);

  if (providerUserId) {
    const providerNotif = await createNotification(
      providerUserId,
      'Booking Update',
      `Booking ${booking.id} changed to ${updatedStatus}.`,
      'BOOKING'
    );
    notifications.push(providerNotif);
  }

  if (io) {
    // Emit to customer's room
    emitToUserRoom(io, booking.customerId, 'bookingUpdated', { 
      bookingId: booking.id, 
      status: updatedStatus,
      serviceCategory: booking.serviceCategory 
    });
    if (notifications[0]) {
      emitToUserRoom(io, booking.customerId, 'notification', notifications[0]);
    }

    // Emit to provider's room
    if (providerUserId) {
      emitToUserRoom(io, providerUserId, 'bookingStatusChanged', {
        bookingId: booking.id,
        status: updatedStatus,
        serviceCategory: booking.serviceCategory
      });
      if (notifications[1]) {
        emitToUserRoom(io, providerUserId, 'notification', notifications[1]);
      }
    }
  }
}

/**
 * Notify provider about service approval
 */
export async function notifyServiceApproved(providerUserId, serviceName) {
  const notification = await createNotification(
    providerUserId,
    'Service Approved',
    `Your service request "${serviceName}" has been approved.`,
    'SERVICE_APPROVAL'
  );
  return notification;
}

/**
 * Notify provider about service denial
 */
export async function notifyServiceDenied(providerUserId, serviceName, reason) {
  const notification = await createNotification(
    providerUserId,
    'Service Denied',
    `Your service request "${serviceName}" has been denied.\nReason: ${reason || 'No reason provided'}`,
    'SERVICE_DENIAL'
  );
  return notification;
}

/**
 * Notify about review publication
 */
export async function notifyReviewPublished(userId) {
  const notification = await createNotification(
    userId,
    'Review Published',
    'Thank you for sharing your feedback. It helps other customers choose trusted providers.',
    'REVIEW'
  );
  return notification;
}

// ============================================================
// ServeGo Business Model — Lead / Promotion / Subscription events
// ============================================================

/**
 * Create a notification and (when io is available) emit both the generic
 * `notification` event and a bespoke real-time event to the user's room.
 */
export async function pushNotification(io, userId, title, message, type, event, payload = null) {
  const notification = await createNotification(userId, title, message, type);
  if (io && notification) {
    emitToUserRoom(io, userId, event, payload ?? notification);
  }
  return notification;
}

/** New lead pushed to a provider (booking request with response timer). */
export async function notifyNewLead(io, providerUserId, leadPayload) {
  const notification = await createNotification(
    providerUserId,
    'New Booking Request',
    'A new service request has arrived. You have limited time to accept it.',
    'LEAD'
  );
  if (io && notification) {
    emitToUserRoom(io, providerUserId, 'newLead', leadPayload ?? notification);
    emitToUserRoom(io, providerUserId, 'notification', notification);
  }
  return notification;
}

/** Provider accepted the lead — inform the customer. */
export async function notifyLeadAccepted(io, customerId, payload) {
  return pushNotification(
    io,
    customerId,
    'Booking Confirmed',
    'A provider has accepted your service request.',
    'LEAD',
    'leadAccepted',
    payload
  );
}

/** Provider rejected the lead — inform the customer a new provider is being found. */
export async function notifyLeadRejected(io, customerId, payload) {
  return pushNotification(
    io,
    customerId,
    'Provider Unavailable',
    'The requested provider could not take the job. Finding you the next best provider...',
    'LEAD',
    'leadRejected',
    payload
  );
}

/** Lead transferred to the next ranked provider. */
export async function notifyLeadTransferred(io, providerUserId, payload) {
  return pushNotification(
    io,
    providerUserId,
    'New Booking Request',
    'A service request has been reassigned to you. Accept it before the timer runs out.',
    'LEAD',
    'newLead',
    payload
  );
}

/** Lead reassigned away from a provider (booking lock / cancellation). */
export async function notifyLeadReassigned(io, providerUserId, payload) {
  return pushNotification(
    io,
    providerUserId,
    'Request Reassigned',
    'A request you were offered has been reassigned to another provider.',
    'LEAD',
    'leadReassigned',
    payload
  );
}

/** Another provider accepted the request first — this offer is no longer available. */
export async function notifyLeadCancelled(io, providerUserId, payload) {
  return pushNotification(
    io,
    providerUserId,
    'Request Taken',
    'This request has already been accepted by another provider.',
    'LEAD',
    'leadCancelled',
    payload
  );
}

/** Lead expired for a provider (ignored / timed out). */
export async function notifyLeadExpired(io, providerUserId, payload) {
  return pushNotification(
    io,
    providerUserId,
    'Request Expired',
    'A service request expired because it was not responded to in time.',
    'LEAD',
    'leadExpired',
    payload
  );
}

/** No eligible provider accepted the lead. */
export async function notifyNoProviderFound(io, customerId, payload) {
  return pushNotification(
    io,
    customerId,
    'No Provider Available',
    'We could not find an available provider for your request. Please try again or book later.',
    'LEAD',
    'leadAssignmentFailed',
    payload
  );
}

/** Provider leveled up — celebration popup on the dashboard. */
export async function notifyPromotion(io, providerUserId, payload) {
  return pushNotification(
    io,
    providerUserId,
    `Congratulations! You reached ${payload?.toLevel || ''}`,
    'You have been promoted to a higher provider level with better visibility and discounts.',
    'PROMOTION',
    'promotion',
    payload
  );
}

/** Subscription purchased / upgraded successfully. */
export async function notifySubscriptionPurchased(io, providerUserId, payload) {
  return pushNotification(
    io,
    providerUserId,
    'Subscription Activated',
    'Your subscription is active and new booking leads are enabled.',
    'SUBSCRIPTION',
    'subscription:purchased',
    payload
  );
}

/** Payment for a subscription was successful. */
export async function notifyPaymentSuccessful(io, providerUserId, payload) {
  return pushNotification(
    io,
    providerUserId,
    'Payment Successful',
    'Your subscription payment was processed successfully.',
    'PAYMENT',
    'subscription:paymentSuccess',
    payload
  );
}

/** Invoice generated after a subscription payment. */
export async function notifyInvoiceGenerated(io, providerUserId, payload) {
  return pushNotification(
    io,
    providerUserId,
    'Invoice Generated',
    'Your subscription invoice has been generated.',
    'SUBSCRIPTION',
    'subscription:invoiceGenerated',
    payload
  );
}

/** A provider has been assigned to the customer's request. */
export async function notifyProviderAssigned(io, customerId, payload) {
  return pushNotification(
    io,
    customerId,
    'Provider Assigned',
    'A provider has been assigned to your request.',
    'LEAD',
    'providerAssigned',
    payload
  );
}

/** The assigned provider changed (reassignment). */
export async function notifyProviderChanged(io, customerId, payload) {
  return pushNotification(
    io,
    customerId,
    'Provider Changed',
    'The provider for your request has changed. We are matching you with the next best provider.',
    'LEAD',
    'providerChanged',
    payload
  );
}

/** Provider is on the way / starting the job. */
export async function notifyProviderOnTheWay(io, customerId, payload) {
  return pushNotification(
    io,
    customerId,
    'Provider On The Way',
    'Your provider has started the job and is on the way.',
    'BOOKING',
    'providerOnTheWay',
    payload
  );
}

/** Booking completed. */
export async function notifyBookingCompleted(io, customerId, payload) {
  return pushNotification(
    io,
    customerId,
    'Booking Completed',
    'Your booking has been completed. Thank you for using our service.',
    'BOOKING',
    'bookingCompleted',
    payload
  );
}

/** Subscription became inactive (remaining leads exhausted). */
export async function notifySubscriptionExpired(io, providerUserId, payload) {
  return pushNotification(
    io,
    providerUserId,
    'Subscription Expired',
    'You have used all your booking leads. Purchase the next subscription level to keep receiving requests.',
    'SUBSCRIPTION',
    'subscription:expired',
    payload
  );
}

/** Remaining leads are running low. */
export async function notifyRemainingLeadsLow(io, providerUserId, payload) {
  return pushNotification(
    io,
    providerUserId,
    'Leads Running Low',
    'You are running out of booking leads. Purchase the next subscription level to avoid interruptions.',
    'SUBSCRIPTION',
    'subscription:lowLeads',
    payload
  );
}

/** Provider cooldown triggered by repeated cancellations. */
export async function notifyProviderCooldown(io, providerUserId, payload) {
  return pushNotification(
    io,
    providerUserId,
    'Account Temporarily Disabled',
    'Repeated cancellations have temporarily paused new booking requests.',
    'ACCOUNT',
    'provider:cooldown',
    payload
  );
}

/** Admin notifications — broadcast to the admin socket room only. */
export async function notifyAdmin(io, title, message, payload) {
  if (!io) return null;
  io.to('room:admin').emit('admin:notification', payload ?? { title, message });
  return { title, message };
}

/** Admin — a subscription payment failed. */
export async function notifyAdminPaymentFailed(io, payload) {
  return notifyAdmin(io, 'Payment Failed', 'A provider subscription payment failed.', { ...payload, type: 'PAYMENT_FAILED' });
}

/** Admin — a provider was suspended/disabled. */
export async function notifyAdminProviderSuspended(io, payload) {
  return notifyAdmin(io, 'Provider Suspended', 'A provider account was suspended.', { ...payload, type: 'PROVIDER_SUSPENDED' });
}

/** Admin — a provider crossed the high-cancellation threshold. */
export async function notifyAdminHighCancellation(io, payload) {
  return notifyAdmin(io, 'High Cancellation Provider', 'A provider reached the high cancellation threshold.', { ...payload, type: 'HIGH_CANCELLATION' });
}

/** Admin — a subscription was purchased. */
export async function notifyAdminSubscriptionPurchased(io, payload) {
  return notifyAdmin(io, 'Subscription Purchased', 'A provider purchased a subscription.', { ...payload, type: 'SUBSCRIPTION_PURCHASED' });
}

/** Admin — a provider was promoted. */
export async function notifyAdminProviderPromoted(io, payload) {
  return notifyAdmin(io, 'Provider Promoted', 'A provider reached a new level.', { ...payload, type: 'PROVIDER_PROMOTED' });
}

/** Admin — a customer submitted a permanent/contract service request. */
export async function notifyAdminPermanentServiceRequest(io, payload) {
  return notifyAdmin(io, 'New Permanent Service Request', 'A customer submitted a permanent/contract service request for admin review.', { ...payload, type: 'PERMANENT_SERVICE_REQUEST' });
}

/** Customer — permanent/contract request received by admin. */
export async function notifyPermanentServiceRequestSubmitted(customerId) {
  return createNotification(
    customerId,
    'Request Received',
    'We received your permanent/contract service request. Our team will review it and contact you.',
    'SERVICE'
  );
}

/** Customer — permanent/contract request approved (admin assigned a provider). */
export async function notifyPermanentServiceRequestApproved(customerId, payload) {
  return pushNotification(
    null,
    customerId,
    'Service Request Approved',
    'Your permanent/contract service request was approved. Our team will be in touch with the assigned specialist.',
    'SERVICE',
    'permanentRequest:approved',
    payload
  );
}

/** Customer — permanent/contract request rejected by admin. */
export async function notifyPermanentServiceRequestRejected(customerId, payload) {
  return pushNotification(
    null,
    customerId,
    'Service Request Update',
    'Your permanent/contract service request could not be approved. Please check the admin note for details.',
    'SERVICE',
    'permanentRequest:rejected',
    payload
  );
}
