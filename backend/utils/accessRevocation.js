/**
 * Immediate revocation of already-issued *access* tokens.
 *
 * Revoking a `RefreshSession` stops a stolen refresh token from minting NEW
 * access tokens, but the access token the thief already holds stays valid until
 * its own `exp` (15 min). For "sign out everywhere", a password reset, or an
 * admin block, that window is the whole point of the event — it must close now,
 * not in 15 minutes.
 *
 * An access token is stateless and carries no session id, so a database check on
 * every request would put a query in front of the entire API (rule 12). Instead
 * this is a memory lookup: a `userId -> epoch` map holding the moment that
 * user's access tokens stopped being trustworthy. A token is refused when it was
 * issued *before* that moment (`iat < epoch`).
 *
 * Kept in its own module, free of Prisma and of `auth.js`, because both
 * `auth.js` (the middleware) and `refreshSessionService.js` (the writer) need
 * it and either importing the other would create a cycle.
 *
 * Limits, stated plainly rather than glossed over:
 *  - It is per-process. A multi-instance deployment would need Redis or a
 *    `sessionsValidAfter` column on `User` checked on each request. This
 *    codebase already relies on per-process caches (rule 14) and runs a single
 *    instance, so this matches the existing architecture.
 *  - Entries older than an access token's maximum life are dropped: once no
 *    unexpired token predates the epoch, the entry can no longer deny anything.
 */

// Access tokens live 15 minutes by default. An entry is only meaningful while
// some unexpired token could still predate it, so keep one for comfortably
// longer than the longest access-token lifetime and then forget about it.
const ENTRY_TTL_MS = 60 * 60 * 1000;

/** userId -> epoch seconds before which an access token is not trustworthy. */
const revokedBefore = new Map();

let lastSweep = 0;

/** Drop entries that can no longer deny any live token. */
function sweep(now) {
  // Amortised: the map only grows on revocation events, which are rare, so a
  // time-based check is enough and avoids a timer per user.
  if (now - lastSweep < ENTRY_TTL_MS) return;
  lastSweep = now;
  for (const [userId, epochSeconds] of revokedBefore) {
    const expiresAtMs = epochSeconds * 1000 + ENTRY_TTL_MS;
    if (expiresAtMs <= now) revokedBefore.delete(userId);
  }
}

/**
 * Declare every access token currently in existence for `userId` untrustworthy.
 * Call this for events that invalidate the account as a whole — signing out
 * everywhere, a password change, an admin block.
 *
 * Deliberately NOT called for an ordinary single-device logout: an access token
 * carries no device identity, so honouring the event would also sign the user
 * out of their phone and laptop. Those devices keep working until their own
 * tokens expire, which is the correct trade for a stateless access token.
 */
export function markAccessTokensRevoked(userId, atMs = Date.now()) {
  if (!userId) return;
  const epochSeconds = Math.floor(atMs / 1000);
  const existing = revokedBefore.get(userId);
  // Never move the epoch backwards: a later revocation must not un-revoke tokens
  // an earlier one already killed.
  if (existing === undefined || epochSeconds > existing) {
    revokedBefore.set(userId, epochSeconds);
  }
  sweep(Date.now());
}

/**
 * True when `decoded` (a verified access-token payload) predates a revocation.
 */
export function isAccessTokenRevoked(decoded) {
  if (!decoded?.id || !decoded?.iat) return false;
  const epoch = revokedBefore.get(decoded.id);
  if (epoch === undefined) return false;
  return decoded.iat < epoch;
}

/** Test seam. */
export function _resetAccessRevocations() {
  revokedBefore.clear();
  lastSweep = 0;
}
