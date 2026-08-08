import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import prisma from '../prisma/client.js';
import {
  createBackup,
  listBackups,
  pruneBackups,
  resolveSnapshotBefore,
  restoreBackup,
  tickBackupScheduler
} from '../services/backupService.js';
import { setConfig, getConfig, invalidateConfig } from '../services/adminConfigService.js';

const dbReady = await (async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
})();

const dbTest = dbReady ? test : test.skip;

const purge = async () => {
  if (!dbReady) return;
  await prisma.backup.deleteMany({});
  await prisma.user.deleteMany({
    where: { email: { in: [markerEmail, 'backup-intruder@test.local'] } }
  });
  await prisma.adminConfig.deleteMany({
    where: { key: { in: ['backupScheduleEnabled', 'backupDailyTimeUtc', 'backupWeeklyDay', 'backupRetentionCount', 'backups-test-flag'] } }
  });
};
test.before(purge);
test.after(purge);

const markerEmail = 'backup-restore-marker@test.local';

dbTest('createBackup writes a SUCCESS manifest and a real snapshot file', async () => {
  const backup = await createBackup('MANUAL');
  assert.equal(backup.status, 'SUCCESS');
  assert.ok(backup.filePath);
  assert.ok(fs.existsSync(backup.filePath));
  assert.ok(backup.sizeBytes > 0);
  assert.ok(backup.rowCounts.User >= 1, 'snapshot should include at least the existing users');
});

dbTest('listBackups paginates and filters by kind', async () => {
  await createBackup('MANUAL');
  const page1 = await listBackups({ page: 1, limit: 1 });
  assert.equal(page1.items.length, 1);
  assert.ok(page1.total >= 2);
  assert.equal(page1.pages, Math.ceil(page1.total / 1));

  const daily = await listBackups({ kind: 'DAILY' });
  assert.equal(daily.total, 0, 'no DAILY backups created yet');
});

dbTest('restoreBackup refuses without confirm and rejects unknown ids', async () => {
  await assert.rejects(() => restoreBackup('missing-id', { confirm: false }), /confirm=true/);
  await assert.rejects(() => restoreBackup('missing-id', { confirm: true }), /Backup not found/);
});

dbTest('restoreBackup replays a snapshot exactly (post-snapshot rows are wiped)', async () => {
  await prisma.user.create({
    data: {
      email: markerEmail,
      name: 'Backup Restore Marker',
      password: 'x',
      phone: '0000000000',
      role: 'customer'
    }
  });

  const backup = await createBackup('MANUAL');
  assert.ok(fs.existsSync(backup.filePath));

  const before = await prisma.user.count();

  const intruderEmail = 'backup-intruder@test.local';
  await prisma.user.create({
    data: {
      email: intruderEmail,
      name: 'Backup Intruder',
      password: 'x',
      phone: '0000000001',
      role: 'customer'
    }
  });

  await restoreBackup(backup.id, { confirm: true });

  const afterIntruder = await prisma.user.findUnique({ where: { email: intruderEmail } });
  assert.equal(afterIntruder, null, 'rows created after the snapshot must not survive the restore');

  const marker = await prisma.user.findUnique({ where: { email: markerEmail } });
  assert.ok(marker, 'rows that were in the snapshot must be restored');

  const after = await prisma.user.count();
  assert.equal(after, before, 'row count must be identical after restore');

  const restored = await prisma.backup.findUnique({ where: { id: backup.id } });
  assert.ok(restored.restoredAt, 'manifest records restoredAt');
});

dbTest('resolveSnapshotBefore picks the newest snapshot at/before a time', async () => {
  const all = await prisma.backup.findMany({ where: { status: 'SUCCESS' }, orderBy: { createdAt: 'desc' } });
  const past = await resolveSnapshotBefore(new Date(all[0].createdAt.getTime() + 1).toISOString());
  assert.equal(past.id, all[0].id);

  const tooEarly = await resolveSnapshotBefore(new Date(all[0].createdAt.getTime() - 1000).toISOString());
  assert.ok(tooEarly && tooEarly.id !== all[0].id, 'older snapshot selected before the first');
});

dbTest('tickBackupScheduler is a no-op when disabled, runs daily when due', async () => {
  await setConfig('backupScheduleEnabled', false, 'test');
  const off = await tickBackupScheduler();
  assert.equal(off.reason, 'disabled');
  assert.equal(off.triggered, false);

  const dailyBefore = await prisma.backup.count({ where: { kind: 'DAILY' } });
  await setConfig('backupScheduleEnabled', true, 'test');
  const now = new Date();
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  await setConfig('backupDailyTimeUtc', `${hh}:${mm}`, 'test');
  await setConfig('backupRetentionCount', 50, 'test');

  const on = await tickBackupScheduler();
  assert.equal(on.triggered, true);
  assert.ok(on.kinds.includes('DAILY'));
  const dailyAfter = await prisma.backup.count({ where: { kind: 'DAILY' } });
  assert.equal(dailyAfter, dailyBefore + 1);

  const again = await tickBackupScheduler();
  assert.equal(again.triggered, false, 'already backed up for today');
});

dbTest('pruneBackups respects the retention count and removes files', async () => {
  await setConfig('backupRetentionCount', 2, 'test');
  const manual = await createBackup('MANUAL');
  await createBackup('MANUAL');
  await createBackup('MANUAL');

  const remaining = await prisma.backup.findMany({ orderBy: { createdAt: 'desc' } });
  assert.equal(remaining.length, 2, 'only the two newest backups remain');
  const deletedFile = manual.filePath;
  assert.equal(fs.existsSync(deletedFile), false, 'pruned snapshot file removed from disk');
});

dbTest('backup scheduler config falls back to defaults when unset', async () => {
  await prisma.adminConfig.deleteMany({
    where: { key: { in: ['backupScheduleEnabled', 'backupDailyTimeUtc', 'backupWeeklyDay', 'backupRetentionCount'] } }
  });
  for (const key of ['backupScheduleEnabled', 'backupDailyTimeUtc', 'backupWeeklyDay', 'backupRetentionCount']) {
    invalidateConfig(key);
  }
  assert.equal(await getConfig('backupScheduleEnabled', true), true);
  assert.equal(await getConfig('backupDailyTimeUtc', '02:00'), '02:00');
  assert.equal(await getConfig('backupWeeklyDay', 0), 0);
  assert.equal(await getConfig('backupRetentionCount', 14), 14);
});
