/**
 * Rule 19 — machine-readable backend codes → friendly, actionable copy.
 *
 * The backend returns `{ success:false, code, message }` on every failure
 * (serviceError / sendApiError). This module is the single source of truth for
 * what the UI shows. Components should call `getErrorMessage` with the
 * response data (or a thrown Error) and let it resolve the friendly copy +
 * an optional recovery action — never render a raw `error.message` or a bare
 * "Something went wrong".
 */

export const NETWORK_ERROR_MESSAGE =
  'Could not reach the server. Check your connection and try again.';

const GENERIC_MESSAGE = 'Something went wrong. Please try again in a moment.';

// Exact codes the backend emits. When a code is listed here the friendly copy
// wins over whatever `message` came along for the ride.
const CODE_COPY = {
  // --- generic / auth ---
  INTERNAL_ERROR: { message: 'We hit a snag on our end. Please try again in a moment.' },
  UNAUTHORIZED: { message: 'Your session has expired. Please sign in again.' },
  FORBIDDEN: { message: 'You do not have permission to do that.' },
  NOT_FOUND: { message: 'That could not be found. It may have been removed.' },
  VALIDATION_ERROR: { message: 'Please check your details and try again.' },
  MISSING_FIELDS: { message: 'Some required details are missing. Please review and try again.' },
  INVALID_PAYLOAD: { message: 'Some of the details you entered look wrong. Please review them.' },
  INVALID_CREDENTIALS: { message: 'Incorrect email or password.' },
  INVALID_TOKEN: { message: 'That link or code is invalid or has expired.' },
  INVALID_RESET_CODE: { message: 'That reset code is invalid or has expired. Please request a new one.' },
  MISSING_TOKEN: { message: 'That link is missing the required code. Please try again.' },
  INVALID_REFRESH_TOKEN: { message: 'Your session could not be refreshed. Please sign in again.' },
  AUTH_BLOCKED: { message: 'Your account has been blocked. Contact support for help.' },
  ACCOUNT_INACTIVE: { message: 'Your account is not active yet. Check your email for a confirmation link.' },
  ACCOUNT_NOT_ACTIVE: { message: 'Your account is not active yet. Check your email for a confirmation link.' },
  NOT_VERIFIED: { message: 'Please verify your account before continuing.' },
  WEAK_PASSWORD: { message: 'That password is too weak. Use at least 8 characters with letters and numbers.' },
  PASSWORD_MISMATCH: { message: 'The passwords you entered do not match.' },
  EMAIL_EXISTS: { message: 'An account with that email already exists. Try signing in instead.' },
  EMAIL_FAILED: { message: 'We could not send that email right now. Please try again shortly.' },
  USER_NOT_FOUND: { message: 'We could not find that account. Check the details and try again.' },
  PROVIDER_NOT_FOUND: { message: 'That provider could not be found.' },
  PROFILE_INCOMPLETE: { message: 'Please finish setting up your profile before continuing.' },
  PROVIDER_BLOCKED: { message: 'This provider is currently unavailable.' },
  INVALID_ROLE: { message: 'You do not have the right account type for that action.' },
  RATE_LIMITED: { message: 'You are doing that a little too quickly. Please wait a moment.' },

  // --- leads ---
  LEAD_NOT_FOUND: { message: 'This lead is no longer available.', action: 'Refresh leads' },
  LEAD_SETTLED: { message: 'This lead has already been handled.', action: 'Refresh leads' },
  LEAD_EXPIRED: { message: 'This lead expired before it could be accepted.', action: 'Refresh leads' },
  LEAD_ALREADY_ACCEPTED: { message: 'This lead was already accepted by another provider.', action: 'Refresh leads' },
  LEAD_ALREADY_REJECTED: { message: 'This lead is no longer available.', action: 'Refresh leads' },
  NOT_ASSIGNED: { message: 'This lead is not assigned to you anymore.', action: 'Refresh leads' },
  ACCEPT_RACE: { message: 'Another provider accepted this lead just before you.', action: 'Refresh leads' },
  NO_CHANGE: { message: 'This lead has already been handled.', action: 'Refresh leads' },
  CUSTOMER_BUSY: { message: 'The customer already has a provider assigned.', action: 'Refresh leads' },

  // --- bookings ---
  BOOKING_NOT_FOUND: { message: 'This booking could not be found.', action: 'View bookings' },
  NO_BOOKING: { message: 'There is no active booking to do that with.', action: 'View bookings' },
  BOOKING_NOT_COMPLETED: { message: 'This booking needs to be completed before you can do that.', action: 'View booking' },
  INVALID_BOOKING: { message: 'This booking can no longer be changed.', action: 'View booking' },
  INVALID_STATE: { message: 'This booking has moved on since you last looked. Please refresh.', action: 'Refresh booking' },
  INVALID_TRANSITION: { message: 'This booking cannot make that change from its current state.', action: 'View booking' },
  INVALID_STATUS: { message: 'This booking no longer supports that action.', action: 'View booking' },
  BOOKING_ALREADY_CANCELLED: { message: 'This booking was already cancelled.', action: 'View booking' },
  CANNOT_CANCEL_COMPLETED: { message: 'This booking is already completed and cannot be cancelled.', action: 'View booking' },
  CANNOT_START_NOT_CONFIRMED: { message: 'This booking is not confirmed yet, so work cannot start.', action: 'View booking' },
  CONFIRMATION_REQUIRED: { message: 'Please confirm the booking before starting work.', action: 'View booking' },
  ALREADY_REVIEWED: { message: 'You have already reviewed this booking.' },

  // --- payment / wallet ---
  PAYMENT_ORDER_FAILED: { message: 'We could not start that payment. Please try again.' },
  PAYMENT_GATEWAY_UNAVAILABLE: { message: 'The payment provider is unavailable right now. Please try again shortly.' },
  PAYMENT_REFUND_FAILED: { message: 'We could not process the refund. Please contact support.' },
  INVALID_CODE: { message: 'That payment code is invalid or has already been used.' },
  INVALID_AMOUNT: { message: 'That amount is not valid.' },
  INSUFFICIENT_BALANCE: { message: 'Your balance is not enough to cover this.' },
  WALLET_BUSY: { message: 'Another withdrawal is already being processed. Please wait a moment.' },
  TRANSACTION_NOT_FOUND: { message: 'That transaction could not be found.' },
  WITHDRAWAL_MINIMUM: { message: 'The amount is below the minimum withdrawal limit.' },
  PLATFORM_FEE_DISABLED: { message: 'Platform fees are not available right now.' },
  PLATFORM_FEE_ZERO: { message: 'There is nothing to pay.' },

  // --- subscriptions ---
  SUBSCRIPTION_ACTIVE: { message: 'You already have an active subscription.' },

  // --- reviews / services ---
  INVALID_RATING: { message: 'Please pick a rating between 1 and 5.' },
  INVALID_REFERRAL: { message: 'That referral code is not valid.' },
  INVALID_PINCODE: { message: 'That PIN code is not valid.' },
  INVALID_DATE: { message: 'That date is not valid. Please pick another one.' },
  INVALID_PERIOD: { message: 'That period is not valid. Please adjust the dates.' },
  INVALID_RANGE: { message: 'That value is outside the allowed range.' },
  INVALID_VALUE: { message: 'One of the values you entered is not valid.' },
  INVALID_SIGNATURE: { message: 'That request could not be verified. Please try again.' },
  OVERLAPPING_AVAILABILITY: { message: 'That slot overlaps with an existing availability entry.' },
  INVALID_AVAILABILITY: { message: 'That availability is not valid.' },
  CATEGORY_IN_USE: { message: 'That category is in use and cannot be deleted.' },
  DUPLICATE_ENTRY: { message: 'That already exists. Please check and try again.' },
  LEVEL_EXISTS: { message: 'A rule with that name already exists.' },
  MESSAGE_TOO_LONG: { message: 'That message is too long. Please shorten it.' },
  NO_FILE: { message: 'Please attach a file first.' },
  UPLOAD_FAILED: { message: 'We could not upload that file. Please try again.' },
};

// When the exact code is unknown, fall back per domain prefix so users still
// get a helpful, domain-specific line instead of a raw message.
const PREFIX_FALLBACK = {
  LEAD_: { message: 'This lead is no longer available.', action: 'Refresh leads' },
  BOOKING_: { message: 'Unable to update this booking.', action: 'View booking' },
  PAYMENT_: { message: 'We could not process that payment. Please try again.', action: 'Try again' },
  WALLET_: { message: 'We could not complete that wallet action. Please try again.', action: 'Try again' },
  SUBSCRIPTION_: { message: 'We could not update your subscription. Please try again.' },
  AUTH_: { message: 'We could not complete that sign-in step. Please try again.' },
};

const NETWORK_PATTERNS = [
  /network error/i,
  /failed to fetch/i,
  /fetch failed/i,
  /network request failed/i,
  /could not reach/i,
  /request failed after retries/i,
  /both render and localhost/i,
  /connect to server/i,
  /load failed/i,
];

// Only an explicit network-shaped string counts as a network failure. An
// empty/absent message must fall through to the caller's fallback (or the
// generic line), never be coerced into a connectivity error.
const isNetworkError = (msg) => Boolean(msg) && NETWORK_PATTERNS.some((re) => re.test(msg));

const resolveEntry = (code) => {
  if (!code) return null;
  if (CODE_COPY[code]) return CODE_COPY[code];
  // No exact hit: pick the longest domain prefix that matches (e.g. an
  // unknown LEAD_* code still resolves to the leads copy).
  let best = null;
  for (const prefix of Object.keys(PREFIX_FALLBACK)) {
    if (String(code).startsWith(prefix) && (!best || prefix.length > best.prefix.length)) {
      best = { prefix, entry: PREFIX_FALLBACK[prefix] };
    }
  }
  return best ? best.entry : null;
};

/**
 * Resolve a friendly message for any failure payload.
 * Accepts API response data ({ code, message, error }), a thrown Error, or a
 * raw string. Never returns an empty string.
 */
export function getErrorMessage(payload, fallback = GENERIC_MESSAGE) {
  const code = payload?.code;
  const message = payload?.message || payload?.error || (typeof payload === 'string' ? payload : null);
  const entry = resolveEntry(code);
  if (entry) return entry.message;
  if (isNetworkError(message)) return NETWORK_ERROR_MESSAGE;
  if (message) return message;
  return fallback;
}

/** Optional recovery action ("Refresh leads", "View booking") or null. */
export function getRecoveryAction(payload) {
  const entry = resolveEntry(payload?.code);
  return entry?.action || null;
}

/** Convenience: `{ message, action }` for one-shot render helpers. */
export function getErrorInfo(payload, fallback = GENERIC_MESSAGE) {
  return { message: getErrorMessage(payload, fallback), action: getRecoveryAction(payload) };
}
