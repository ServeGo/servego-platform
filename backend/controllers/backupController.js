import fs from 'node:fs';
import path from 'node:path';
import prisma from '../prisma/client.js';
import {
  createBackup,
  listBackups,
  pruneBackups,
  resolveSnapshotBefore,
  restoreBackup,
  tickBackupScheduler
} from '../services/backupService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

export const BackupController = {
  /** Admin: paginated backup manifest list. */
  getBackups: async (req, res) => {
    try {
      const { page = 1, limit = 20, kind } = req.query;
      const result = await listBackups({ page, limit, kind: kind || null });
      return sendApiSuccess(res, 200, result);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to list backups', err.message);
    }
  },

  /** Admin: trigger a manual logical snapshot now. */
  createBackup: async (req, res) => {
    try {
      const record = await createBackup('MANUAL');
      return sendApiSuccess(res, 201, { backup: record });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to create backup', err.message);
    }
  },

  /** Admin: download a snapshot file as an attachment. */
  downloadBackup: async (req, res) => {
    try {
      const { id } = req.params;
      const record = await prisma.backup.findUnique({ where: { id } });
      if (!record || record.status !== 'SUCCESS' || !fs.existsSync(record.filePath)) {
        return sendApiError(res, 404, 'NOT_FOUND', 'Backup file not found.');
      }
      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(record.filePath)}"`);
      return fs.createReadStream(record.filePath).pipe(res);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to stream backup file', err.message);
    }
  },

  /** Admin: restore the database from a snapshot (destructive — requires confirm). */
  restore: async (req, res) => {
    try {
      const { id } = req.params;
      const { confirm } = req.body;
      const result = await restoreBackup(id, { confirm: confirm === true || confirm === 'true' });
      return sendApiSuccess(res, 200, result);
    } catch (err) {
      if (err.status) return sendApiError(res, err.status, 'RESTORE_FAILED', err.message);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Restore failed', err.message);
    }
  },

  /** Admin: point-in-time recovery — restore the newest snapshot at/before a timestamp. */
  restoreAt: async (req, res) => {
    try {
      const { at, confirm } = req.body;
      if (!at) return sendApiError(res, 400, 'MISSING_FIELDS', 'at is required.');
      const record = await resolveSnapshotBefore(at);
      if (!record) return sendApiError(res, 404, 'NOT_FOUND', 'No successful snapshot before the requested time.');
      const result = await restoreBackup(record.id, { confirm: confirm === true || confirm === 'true' });
      return sendApiSuccess(res, 200, { backup: record, result });
    } catch (err) {
      if (err.status) return sendApiError(res, err.status, 'RESTORE_FAILED', err.message);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Restore failed', err.message);
    }
  },

  /** Admin: run the scheduler once (manual "catch-up") and prune old snapshots. */
  tick: async (req, res) => {
    try {
      const result = await tickBackupScheduler();
      const pruned = await pruneBackups();
      return sendApiSuccess(res, 200, { ...result, pruned });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Scheduler tick failed', err.message);
    }
  }
};
