-- Record-keeping no-op.
--
-- This migration was applied to the database in an earlier local run, but its
-- SQL file was lost before it was committed (the folder was left empty). The
-- database already reflects the applied state, so nothing here is re-executed
-- on deploy. The file exists purely so Prisma can reconcile migration history;
-- do not remove the folder or migrate deploy/status will fail with P3015.
SELECT 1;