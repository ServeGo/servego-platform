import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client.js';
import { generateRefreshToken, REFRESH_SESSION_MAX_AGE_MS } from '../utils/auth.js';
import { markAccessTokensRevoked } from '../utils/accessRevocation.js';

/**
 * Server-side refresh-token sessions — the authoritative layer for "is this
 * refresh token still allowed to mint access tokens?".
 *
 * Why a table and not an in-memory deny-list (rule 14): revocation state must
 * survive a deploy and be correct on every instance. The in-memory TTL caches
 * are for read-mostly catalog data; a deny-list held in one process would reset
 * on every restart and silently un-revoke every stolen token.
 *
 * ## Why the token is NOT rotated on every refresh
 *
 * The textbook design rotates the refresh token and treats a replay of a rotated
 * token as a compromise. That requires every client to single-flight refresh
 * *across browser tabs* — two tabs open on a dashboard both receive a 401 at the
 * same moment and both present the same token. With reuse detection that benign
 * race looks exactly like an attacker, so the family gets revoked and the user
 * is signed out of their other device. This codebase's client has no cross-tab
 * coordination today, so rotating would trade a real security gap for a
 * reliability one.
 *
 * Instead a refresh token is stable for the life of its session and the row
 * carries the state. That is what actually closes the reported hole: a token
 * copied before logout resolves to a row whose `revokedAt` is set, so
 * /auth/refresh refuses it. Reuse-based *detection* is deliberately left out
 * rather than shipped in a form that logs out legitimate multi-tab users; it can
 * be layered on later behind the cross-tab coordination it depends on.
 */

export const REVOKE_REASON = {
  LOGOUT: 'LOGOUT',
  LOGOUT_ALL: 'LOGOUT_ALL',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  ACCOUNT_BLOCKED: 'ACCOUNT_BLOCKED',
  EXPIRED: 'EXPIRED',
  /** The presented token's signature was valid but its hash did not match the row. */
  TAMPERED: 'TAMPERED',
  /** The user exceeded MAX_ACTIVE_SESSIONS; the oldest session was dropped. */
  SESSION_TRIMMED: 'SESSION_TRIMMED'
};

/**
 * Revocations that condemn the account, not just one device.
 *
 * These additionally invalidate access tokens that are already in the wild. A
 * plain `LOGOUT` is excluded on purpose: an access token carries no device
 * identity, so honouring it would sign the user out of their other devices too
 * — the multi-device problem that stable tokens exist to avoid.
 */
const ACCOUNT_WIDE_REASONS = new Set([
  REVOKE_REASON.LOGOUT_ALL,
  REVOKE_REASON.PASSWORD_CHANGED,
  REVOKE_REASON.ACCOUNT_BLOCKED
]);

/** Per-user ceiling on live sessions, so a looping client cannot grow the table without bound. */
const MAX_ACTIVE_SESSIONS = 10;

export function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

/**
 * Compare a presented token against the stored hash in constant time.
 *
 * `===` short-circuits at the first differing byte, which leaks how much of a
 * hash an attacker matched. There is no realistic way to exploit that here — the
 * `jti` is 256 bits of entropy and the signature already verified, so guessing
 * a preimage is infeasible either way — but the correct primitive costs nothing
 * and removes the question entirely.
 */
function tokenHashMatches(presented, stored) {
  const a = Buffer.from(hashToken(presented), 'utf8');
  const b = Buffer.from(String(stored), 'utf8');
  // timingSafeEqual throws on a length mismatch, which would itself be a signal;
  // differing lengths mean "not a match" and must be answered as such.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Milliseconds until a token we just signed stops being valid. */
function expiryFromToken(token) {
  const decoded = jwt.decode(token);
  if (decoded?.exp) return new Date(decoded.exp * 1000);
  return new Date(Date.now() + REFRESH_SESSION_MAX_AGE_MS);
}

/**
 * Mint a refresh token and its `RefreshSession` row together, so a token can
 * never exist without the record needed to revoke it.
 */
export async function issueSession({ user, ip = null, userAgent = null }) {
  const jti = crypto.randomBytes(32).toString('hex');
  const refreshToken = generateRefreshToken(user, { jti });
  const expiresAt = expiryFromToken(refreshToken);

  const session = await prisma.refreshSession.create({
    data: {
      jti,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
      absoluteExpiry: new Date(Date.now() + REFRESH_SESSION_MAX_AGE_MS),
      ip,
      userAgent: userAgent ? String(userAgent).slice(0, 500) : null
    }
  });

  // Bound the table: without this a client stuck in a login retry loop (or an
  // attacker replaying one) would leave a live row per attempt, and every one of
  // them is a credential that "sign out everywhere" has to walk. The oldest are
  // dropped, so the newest devices are the ones that survive.
  await trimToSessionCap(user.id).catch((e) => {
    console.error('[refreshSession] session cap trim failed:', e.message);
  });

  return { session, refreshToken };
}

/**
 * Keep at most MAX_ACTIVE_SESSIONS live sessions per user, revoking the oldest
 * with reason SESSION_TRIMMED. Never throws — a full table must not stop someone
 * signing in.
 */
async function trimToSessionCap(userId) {
  const live = await prisma.refreshSession.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { jti: true },
  });

  const excess = live.slice(MAX_ACTIVE_SESSIONS);
  if (excess.length === 0) return 0;

  await prisma.refreshSession.updateMany({
    where: { jti: { in: excess.map((s) => s.jti) }, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: REVOKE_REASON.SESSION_TRIMMED }
  });

  return excess.length;
}

export function findByJti(jti) {
  if (!jti) return null;
  return prisma.refreshSession.findUnique({ where: { jti } });
}

/**
 * The single gate every /auth/refresh call passes.
 *
 * Returns `{ ok: true, session }` or `{ ok: false, code, message }` so the
 * controller can map a precise, stable error code to the client (rule 19)
 * instead of collapsing every failure into one opaque 401.
 */
export async function assertUsable(token, jti) {
  const session = await findByJti(jti);
  if (!session) {
    // A valid signature over an unknown jti means the token predates session
    // tracking. Honouring it would be exactly the un-revocable token this
    // feature exists to remove, so it is refused.
    return {
      ok: false,
      code: 'REFRESH_TOKEN_REVOKED',
      message: 'This session is no longer valid. Please sign in again.'
    };
  }

  if (session.revokedAt) {
    return {
      ok: false,
      code: 'REFRESH_TOKEN_REVOKED',
      message: 'You have been signed out. Please sign in again.'
    };
  }

  if (!tokenHashMatches(token, session.tokenHash)) {
    // Right jti, wrong token: the signature verified but the bytes do not match
    // the row, so this is a forgery attempt rather than a stale client.
    await revokeByJti(jti, REVOKE_REASON.TAMPERED);
    return {
      ok: false,
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Invalid or expired refresh token.'
    };
  }

  const now = new Date();
  if (session.absoluteExpiry <= now || session.expiresAt <= now) {
    await revokeByJti(jti, REVOKE_REASON.EXPIRED);
    return {
      ok: false,
      code: 'REFRESH_TOKEN_EXPIRED',
      message: 'Your session has expired. Please sign in again.'
    };
  }

  return { ok: true, session };
}

export async function touchSession(jti) {
  // Best-effort: a failed audit timestamp must never fail a legitimate refresh.
  try {
    await prisma.refreshSession.updateMany({
      where: { jti, revokedAt: null },
      data: { lastUsedAt: new Date() }
    });
  } catch {
    // ignored
  }
}

/** Revoke one session. Idempotent (rule 18): a second call is a no-op, not an error. */
export function revokeByJti(jti, reason) {
  if (!jti) return Promise.resolve(0);
  return prisma.refreshSession.updateMany({
    where: { jti, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason }
  }).then((r) => r.count);
}

/** Revoke every live session for a user (sign out everywhere, password reset, account block). */
export function revokeAllForUser(userId, reason) {
  // Ordered before the write: if the DB write fails we must not have already
  // killed the user's access tokens, because they would then be unable to use a
  // session that is still valid.
  if (ACCOUNT_WIDE_REASONS.has(reason)) {
    markAccessTokensRevoked(userId);
  }

  return prisma.refreshSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason }
  }).then((r) => r.count);
}

export function listActiveForUser(userId) {
  return prisma.refreshSession.findMany({
    where: { userId, revokedAt: null },
    select: {
      id: true,
      ip: true,
      userAgent: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Drop rows that can no longer authorise anything, so the table does not grow
 * without bound. An expired row is already refused by `assertUsable`, so
 * deleting it loses no security.
 *
 * Revoked rows are kept for a grace window so a just-signed-out user hitting a
 * stale client still gets the "you were signed out" answer rather than a
 * generic "unknown token" one.
 */
export async function sweepDeadSessions({ revokedGraceMs = 24 * 60 * 60 * 1000 } = {}) {
  const now = new Date();
  const revokedCutoff = new Date(now.getTime() - revokedGraceMs);

  const [expired, revoked] = await Promise.all([
    prisma.refreshSession.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.refreshSession.deleteMany({
      where: { revokedAt: { not: null, lt: revokedCutoff } }
    })
  ]);

  return { expired: expired.count, revoked: revoked.count };
}
