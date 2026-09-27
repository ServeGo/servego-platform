-- Drop the unused refresh-rotation columns.
--
-- `familyId` and `rotatedToJti` were added for rotation-with-reuse-detection,
-- which this codebase deliberately does NOT do: rotating requires cross-tab
-- single-flight on the client, and without it two tabs hitting 401 at the same
-- moment present the same token, which reuse detection would read as an
-- attacker and answer by signing the user out everywhere.
--
-- Tokens are therefore stable for the life of a session, so nothing ever wrote
-- these columns and no query ever read them. They are dead weight that also
-- misleads the next reader into thinking rotation is in play. Rule 13: delete
-- indexes no query touches.
DROP INDEX IF EXISTS "RefreshSession_familyId_idx";
ALTER TABLE "RefreshSession" DROP COLUMN IF EXISTS "rotatedToJti";
ALTER TABLE "RefreshSession" DROP COLUMN IF EXISTS "familyId";
