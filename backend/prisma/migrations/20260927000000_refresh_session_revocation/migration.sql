-- Server-side refresh-token revocation.
--
-- Until now a refresh token was a pure HS256 JWT carrying `{ id, type, iat }`.
-- Nothing on the server could invalidate one, so signing out was purely a
-- client-side `localStorage.removeItem` — a refresh token copied before logout
-- stayed usable for its full 7 days. The token also had no `jti`, so two
-- refreshes in the same second produced a byte-identical token.
--
-- This adds the session table that makes revocation real. The JWT keeps carrying
-- the signature and `exp`; the row carries the state. Only the SHA-256 of the
-- token is stored, so a dump of this table cannot be replayed against
-- /auth/refresh — the same rule `User.resetToken` already follows.
CREATE TABLE "RefreshSession" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "absoluteExpiry" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "rotatedToJti" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

-- Refresh lookup: every /auth/refresh resolves a token by its jti.
CREATE UNIQUE INDEX "RefreshSession_jti_key" ON "RefreshSession"("jti");
-- Revoke-all (logout-everywhere, password reset, provider block) and the
-- active-session list. Leading `userId` also serves `userId`-only queries.
CREATE INDEX "RefreshSession_userId_revokedAt_idx" ON "RefreshSession"("userId", "revokedAt");
-- Reuse detection: revoking a compromised token revokes its whole rotation chain.
CREATE INDEX "RefreshSession_familyId_idx" ON "RefreshSession"("familyId");
-- Cleanup sweep of dead rows.
CREATE INDEX "RefreshSession_expiresAt_idx" ON "RefreshSession"("expiresAt");

-- CASCADE, unlike the RESTRICT used by most User relations: a session must never
-- outlive the account it authenticates.
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
