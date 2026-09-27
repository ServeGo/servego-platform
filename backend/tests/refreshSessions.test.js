import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client.js';
import { generateAuthToken, generateRefreshToken, requireAuth, optionalAuth, verifyRefreshToken } from '../utils/auth.js';
import {
  markAccessTokensRevoked,
  isAccessTokenRevoked,
  _resetAccessRevocations,
} from '../utils/accessRevocation.js';
import {
  REVOKE_REASON,
  assertUsable,
  hashToken,
  issueSession,
  listActiveForUser,
  revokeAllForUser,
  revokeByJti,
  sweepDeadSessions,
  touchSession,
} from '../services/refreshSessionService.js';

// DB-backed tests auto-skip when the database is unreachable (CI / offline).
const dbReady = await (async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
})();
const dbTest = dbReady ? test : test.skip;

const USER_ID = 'refresh-session-test-user';

function mockRes() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

// ---------------------------------------------------------------------------
// Token-mint invariants. These need no database, so they always run and are the
// reason two sessions can no longer collide.
// ---------------------------------------------------------------------------

test('every refresh token carries a unique jti', () => {
  const a = jwt.decode(generateRefreshToken({ id: USER_ID, role: 'customer' }));
  const b = jwt.decode(generateRefreshToken({ id: USER_ID, role: 'customer' }));

  assert.ok(a.jti, 'a jti is minted when none is supplied');
  assert.ok(b.jti);
  // Previously the payload was {id,type,iat} only, so two logins in the same
  // second produced byte-identical tokens — one logout could not tell them apart.
  assert.notEqual(a.jti, b.jti);
});

test('an explicit jti is carried through into the signed token', () => {
  const jti = 'a'.repeat(64);
  const decoded = jwt.decode(generateRefreshToken({ id: USER_ID, role: 'customer' }, { jti }));

  assert.equal(decoded.jti, jti);
  assert.equal(verifyRefreshToken(generateRefreshToken({ id: USER_ID, role: 'customer' }, { jti })).jti, jti);
});

test('hashToken is deterministic and does not store the raw token', () => {
  const raw = 'super-secret-refresh-token';

  assert.equal(hashToken(raw), hashToken(raw));
  assert.notEqual(hashToken(raw), raw);
  assert.equal(hashToken(raw).length, 64);
  assert.notEqual(hashToken(raw), hashToken(`${raw}x`));
});

test('revoking an empty jti is a safe no-op', async () => {
  assert.equal(await revokeByJti(null, REVOKE_REASON.LOGOUT), 0);
});

// ---------------------------------------------------------------------------
// Access-token revocation. Revoking a RefreshSession stops a stolen refresh
// token minting NEW access tokens, but a token already in the wild would live
// out its 15 minutes. These cover the window being closed immediately.
// ---------------------------------------------------------------------------

test('an access token issued before a revocation is refused, one issued after is not', () => {
  _resetAccessRevocations();

  const before = jwt.decode(generateAuthToken({ id: 'u-rev', role: 'customer' }));
  assert.equal(isAccessTokenRevoked(before), false);

  markAccessTokensRevoked('u-rev', Date.now() + 2000);

  assert.equal(isAccessTokenRevoked(before), true, 'token predating the epoch is dead');
  assert.equal(
    isAccessTokenRevoked({ id: 'u-rev', iat: Math.floor(Date.now() / 1000) + 60 }),
    false,
    'a later token is still good'
  );
  assert.equal(isAccessTokenRevoked({ id: 'someone-else', iat: before.iat }), false, 'other users unaffected');
  assert.equal(isAccessTokenRevoked({ role: 'customer' }), false, 'a token with no id cannot be judged');
});

test('a later revocation never moves the epoch backwards', () => {
  _resetAccessRevocations();

  const now = Date.now();
  markAccessTokensRevoked('u-back', now);
  // An out-of-order event carrying an older timestamp must not resurrect tokens.
  markAccessTokensRevoked('u-back', now - 60_000);

  assert.equal(isAccessTokenRevoked({ id: 'u-back', iat: Math.floor(now / 1000) - 30 }), true);
  _resetAccessRevocations();
});

test('requireAuth refuses a revoked access token with a distinct code', async () => {
  _resetAccessRevocations();

  const token = generateAuthToken({ id: 'u-mw', role: 'customer' });
  const decoded = jwt.decode(token);

  // Live: the request proceeds.
  const liveReq = { headers: { authorization: `Bearer ${token}` } };
  const liveRes = mockRes();
  let nexted = false;
  await requireAuth(liveReq, liveRes, () => { nexted = true; });
  assert.equal(nexted, true);
  assert.equal(liveRes.statusCode, 200);

  // Revoked: blocked, and told so in a way the client can act on.
  markAccessTokensRevoked('u-mw', (decoded.iat + 60) * 1000);
  const deadReq = { headers: { authorization: `Bearer ${token}` } };
  const deadRes = mockRes();
  let deadNexted = false;
  await requireAuth(deadReq, deadRes, () => { deadNexted = true; });

  assert.equal(deadNexted, false, 'a revoked token must not reach a handler');
  assert.equal(deadRes.statusCode, 401);
  assert.equal(deadRes.payload.code, 'SESSION_REVOKED');
  assert.equal(deadReq.user, undefined, 'req.user is never populated from a revoked token');

  _resetAccessRevocations();
});

test('optionalAuth treats a revoked token as absent rather than authenticating it', () => {
  _resetAccessRevocations();

  const token = generateAuthToken({ id: 'u-opt', role: 'customer' });
  const decoded = jwt.decode(token);
  markAccessTokensRevoked('u-opt', (decoded.iat + 60) * 1000);

  const req = { headers: { authorization: `Bearer ${token}` } };
  let nexted = false;
  optionalAuth(req, mockRes(), () => { nexted = true; });

  assert.equal(nexted, true, 'optionalAuth never blocks the request');
  assert.equal(req.user, undefined, 'but it must not present a dead token as authenticated');

  _resetAccessRevocations();
});

// ---------------------------------------------------------------------------
// Session lifecycle. The reported bug lives here: a token copied before logout
// kept working for its full 7-day life.
// ---------------------------------------------------------------------------

async function seedUser() {
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: {
      id: USER_ID,
      name: 'Refresh Session Test',
      email: `${USER_ID}@example.com`,
      phone: '5533000001',
      role: 'customer',
      password: 'x',
    },
  });
}

function purge() {
  return prisma.refreshSession.deleteMany({ where: { userId: USER_ID } });
}

dbTest('an unknown jti is refused, so pre-session tokens cannot be replayed', async () => {
  // A valid signature over a jti with no row means the token predates session
  // tracking. Honouring it is the exact hole this feature closes.
  const verdict = await assertUsable('irrelevant', 'no-such-jti');

  assert.equal(verdict.ok, false);
  assert.equal(verdict.code, 'REFRESH_TOKEN_REVOKED');
});

dbTest('a freshly issued session is usable and returns its own row', async () => {
  await purge();
  await seedUser();
  const { session, refreshToken } = await issueSession({ user: { id: USER_ID } });

  const verdict = await assertUsable(refreshToken, session.jti);
  assert.equal(verdict.ok, true);
  assert.equal(verdict.session.jti, session.jti);

  // The server must never persist the token itself, only its digest.
  const row = await prisma.refreshSession.findUnique({ where: { jti: session.jti } });
  assert.equal(row.tokenHash, hashToken(refreshToken));
  assert.notEqual(row.tokenHash, refreshToken);

  await purge();
});

dbTest('revoking a session blocks the token that was copied before logout', async () => {
  await purge();
  await seedUser();
  const { session, refreshToken } = await issueSession({ user: { id: USER_ID } });
  const stolen = refreshToken;

  assert.equal((await assertUsable(stolen, session.jti)).ok, true);

  const revoked = await revokeByJti(session.jti, REVOKE_REASON.LOGOUT);
  assert.equal(revoked, 1);

  const after = await assertUsable(stolen, session.jti);
  assert.equal(after.ok, false);
  assert.equal(after.code, 'REFRESH_TOKEN_REVOKED');

  const row = await prisma.refreshSession.findUnique({ where: { jti: session.jti } });
  assert.equal(row.revokedReason, REVOKE_REASON.LOGOUT);

  await purge();
});

dbTest('revocation is idempotent — a double sign-out does not double-write', async () => {
  await purge();
  await seedUser();
  const { session } = await issueSession({ user: { id: USER_ID } });

  assert.equal(await revokeByJti(session.jti, REVOKE_REASON.LOGOUT), 1);
  // Second call is a no-op, not an error and not a second revocation row.
  assert.equal(await revokeByJti(session.jti, REVOKE_REASON.LOGOUT), 0);

  await purge();
});

dbTest('revokeAllForUser kills every live session but leaves the reason on each', async () => {
  await purge();
  await seedUser();
  const phone = await issueSession({ user: { id: USER_ID } });
  const laptop = await issueSession({ user: { id: USER_ID } });

  assert.equal((await listActiveForUser(USER_ID)).length, 2);

  const count = await revokeAllForUser(USER_ID, REVOKE_REASON.PASSWORD_CHANGED);
  assert.equal(count, 2);

  assert.equal((await listActiveForUser(USER_ID)).length, 0);
  for (const s of [phone.session, laptop.session]) {
    const row = await prisma.refreshSession.findUnique({ where: { jti: s.jti } });
    assert.equal(row.revokedReason, REVOKE_REASON.PASSWORD_CHANGED);
  }

  await purge();
});

dbTest('a token whose hash does not match its row revokes the row as TAMPERED', async () => {
  await purge();
  await seedUser();
  const { session } = await issueSession({ user: { id: USER_ID } });

  // Right jti, wrong bytes: a forgery, not a stale client.
  const verdict = await assertUsable('a-perfectly-signed-but-wrong-token', session.jti);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.code, 'INVALID_REFRESH_TOKEN');

  const row = await prisma.refreshSession.findUnique({ where: { jti: session.jti } });
  assert.equal(row.revokedReason, REVOKE_REASON.TAMPERED);

  await purge();
});

dbTest('an expired session is refused and marked EXPIRED', async () => {
  await purge();
  await seedUser();
  const { session, refreshToken } = await issueSession({ user: { id: USER_ID } });

  await prisma.refreshSession.update({
    where: { jti: session.jti },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });

  const verdict = await assertUsable(refreshToken, session.jti);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.code, 'REFRESH_TOKEN_EXPIRED');

  await purge();
});

dbTest('touchSession records activity only while the session is live', async () => {
  await purge();
  await seedUser();
  const { session } = await issueSession({ user: { id: USER_ID } });

  await prisma.refreshSession.update({ where: { jti: session.jti }, data: { lastUsedAt: null } });
  await touchSession(session.jti);

  const live = await prisma.refreshSession.findUnique({ where: { jti: session.jti } });
  assert.ok(live.lastUsedAt instanceof Date);

  // Once revoked, the guard in touchSession must stop updating the row, so the
  // audit trail keeps the last moment the session was actually usable.
  await revokeByJti(session.jti, REVOKE_REASON.LOGOUT);
  const stamp = live.lastUsedAt;
  await touchSession(session.jti);
  const after = await prisma.refreshSession.findUnique({ where: { jti: session.jti } });
  assert.deepEqual(after.lastUsedAt, stamp);

  await purge();
});

dbTest('the session cap bounds live sessions and keeps the newest', async () => {
  await purge();
  await seedUser();

  // One more than the cap, issued back to back.
  const issued = [];
  for (let i = 0; i < 11; i += 1) {
    issued.push(await issueSession({ user: { id: USER_ID } }));
  }

  const live = await listActiveForUser(USER_ID);
  assert.ok(live.length <= 10, `live sessions are capped (got ${live.length})`);

  // The newest login is the one that must survive.
  const newest = issued[issued.length - 1];
  const verdict = await assertUsable(newest.refreshToken, newest.session.jti);
  assert.equal(verdict.ok, true, 'the most recent session still works');

  await purge();
});

dbTest('a single-device logout does NOT kill access tokens on other devices', async () => {
  await purge();
  await seedUser();
  _resetAccessRevocations();

  const phone = await issueSession({ user: { id: USER_ID } });
  const laptop = await issueSession({ user: { id: USER_ID } });
  const laptopAccess = jwt.decode(generateAuthToken({ id: USER_ID, role: 'customer' }));

  // Signing out on the phone revokes one session and must leave the laptop's
  // access token alive — an access token carries no device identity, so honouring
  // a per-device logout here would sign the user out everywhere.
  await revokeByJti(phone.session.jti, REVOKE_REASON.LOGOUT);

  assert.equal(isAccessTokenRevoked(laptopAccess), false, 'the other device keeps working');
  const laptopVerdict = await assertUsable(laptop.refreshToken, laptop.session.jti);
  assert.equal(laptopVerdict.ok, true, 'the other device can still refresh');

  await purge();
});

dbTest('logout-all and password change do invalidate live access tokens', async () => {
  await purge();
  await seedUser();
  _resetAccessRevocations();

  const existing = jwt.decode(generateAuthToken({ id: USER_ID, role: 'customer' }));
  const s1 = await issueSession({ user: { id: USER_ID } });
  const s2 = await issueSession({ user: { id: USER_ID } });

  const revoked = await revokeAllForUser(USER_ID, REVOKE_REASON.LOGOUT_ALL);
  assert.equal(revoked, 2);

  // This is the 15-minute window closing: a token minted before the event is
  // refused immediately rather than living out its remaining lifetime.
  assert.equal(isAccessTokenRevoked(existing), true);

  for (const s of [s1, s2]) {
    const verdict = await assertUsable(s.refreshToken, s.session.jti);
    assert.equal(verdict.code, 'REFRESH_TOKEN_REVOKED');
  }

  // A token minted after the event (a fresh sign-in) works again.
  const fresh = jwt.decode(generateAuthToken({ id: USER_ID, role: 'customer' }));
  assert.equal(isAccessTokenRevoked(fresh), false, 'a new sign-in is not affected');

  _resetAccessRevocations();
  await purge();
});

dbTest('the sweep removes expired rows and keeps recently revoked ones for the grace window', async () => {
  await purge();
  await seedUser();

  const expired = await issueSession({ user: { id: USER_ID } });
  await prisma.refreshSession.update({
    where: { jti: expired.session.jti },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });

  const staleRevoked = await issueSession({ user: { id: USER_ID } });
  await prisma.refreshSession.update({
    where: { jti: staleRevoked.session.jti },
    data: { revokedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), revokedReason: REVOKE_REASON.LOGOUT },
  });

  const freshRevoked = await issueSession({ user: { id: USER_ID } });
  await revokeByJti(freshRevoked.session.jti, REVOKE_REASON.LOGOUT);

  const result = await sweepDeadSessions();
  assert.ok(result.expired >= 1);
  assert.ok(result.revoked >= 1);

  // A user who just signed out must still be told they were signed out, not that
  // the token is unknown, so recently revoked rows survive the pass.
  const survivors = await prisma.refreshSession.findMany({ where: { userId: USER_ID } });
  const jtis = survivors.map((s) => s.jti);
  assert.ok(!jtis.includes(expired.session.jti), 'expired row is swept');
  assert.ok(!jtis.includes(staleRevoked.session.jti), 'long-revoked row is swept');
  assert.ok(jtis.includes(freshRevoked.session.jti), 'recently revoked row is retained');

  await purge();
});
