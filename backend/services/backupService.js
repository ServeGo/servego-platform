import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { Prisma } from '@prisma/client';
import prisma from '../prisma/client.js';
import { getConfig } from './adminConfigService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'data', 'backups');

/**
 * Tables that are deliberately preserved (not wiped) during a restore:
 *  - Backup: the manifests themselves (an active restore must not delete its own source).
 *  - Job: queued background work is not replayed from an old snapshot.
 *  - AuditLog: append-only audit trail.
 *  - AdminConfig: live runtime configuration (feature flags, charges) stays current.
 * Everything else is replaced by the snapshot contents.
 */
const EXCLUDED_FROM_RESTORE = new Set(['Backup', 'Job', 'AuditLog', 'AdminConfig']);

const SNAPSHOT_VERSION = 1;

function quoteIdent(name) {
  return `"${name}"`;
}

/**
 * Discover models from the Prisma DMMF and compute a foreign-key-safe
 * topological order: every model appears after all models it references
 * (i.e. after its FK parents). Inserting in this order is parent-first;
 * deleting in the reverse order is child-first. No @map is used anywhere in
 * the schema, so field names equal column names.
 */
function buildTableInfo() {
  const models = Prisma.dmmf.datamodel.models;
  const byName = {};
  for (const m of models) {
    const scalarFields = m.fields.filter((f) => f.kind === 'scalar' || f.kind === 'enum');
    const fkTargets = m.fields
      .filter((f) => f.kind === 'object' && f.relationFromFields && f.relationFromFields.length > 0)
      .map((f) => f.type);
    byName[m.name] = {
      types: Object.fromEntries(
        scalarFields.map((f) => [f.name, f.type === 'DateTime' ? 'datetime' : f.type === 'Json' ? 'json' : 'scalar'])
      ),
      fkTargets
    };
  }

  const order = [];
  const visited = new Set();
  const visit = (name) => {
    if (visited.has(name)) return;
    visited.add(name);
    for (const target of byName[name].fkTargets) visit(target);
    order.push(name);
  };
  models.forEach((m) => visit(m.name));

  return { order, byName };
}

/**
 * Build a single SELECT that snapshots every table in one round trip:
 *   { "User": [ {..}, .. ], "Service": [ ... ], ... }
 * JSON columns are emitted as JSONB, timestamps as ISO-8601 strings.
 */
function buildSnapshotSql(order) {
  const parts = order.map(
    (name, i) =>
      `${i === 0 ? '' : 'UNION ALL\n  '}SELECT '${name}' AS tbl, COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) AS data FROM ${quoteIdent(name)} t`
  );
  return `SELECT COALESCE(jsonb_object_agg(x.tbl, x.data), '{}'::jsonb) AS snapshot FROM (\n  ${parts.join('\n  ')}\n) x;`;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function literalFor(value, type) {
  if (value === null || value === undefined) return 'NULL';
  if (type === 'datetime') return `'${new Date(value).toISOString()}'::timestamptz`;
  if (type === 'json') return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  return sqlLiteral(value);
}

/**
 * Build a DO block that deletes every included table (children first) and
 * re-inserts the snapshot rows (parents first) in a single round trip. The
 * whole block runs atomically — any constraint failure rolls everything back.
 */
function buildRestoreSql(order, byName, tables) {
  const included = order.filter((name) => !EXCLUDED_FROM_RESTORE.has(name));
  const lines = [];

  for (const name of [...included].reverse()) {
    lines.push(`  DELETE FROM ${quoteIdent(name)};`);
  }

  for (const name of included) {
    const rows = tables[name];
    if (!rows || rows.length === 0) continue;
    const cols = Object.keys(rows[0]);
    const types = byName[name].types;
    const values = rows.map(
      (r) => `  (${cols.map((c) => literalFor(r[c], types[c])).join(', ')})`
    );
    lines.push(
      `  INSERT INTO ${quoteIdent(name)} (${cols.map(quoteIdent).join(', ')}) VALUES\n${values.join(',\n')};`
    );
  }

  return `DO $sgd_restore$\nBEGIN\n${lines.join('\n')}\nEND\n$sgd_restore$;`;
}

function snapshotFileStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

/**
 * Create a logical snapshot of the whole database and persist it as a gzipped
 * JSON file. Returns the updated manifest row. On any failure the manifest is
 * marked FAILED and the error is re-thrown. Uses a single batched SQL read so
 * the cost is one round trip regardless of how many tables exist.
 */
export async function createBackup(kind = 'MANUAL', { client = prisma } = {}) {
  const record = await client.backup.create({ data: { kind, status: 'RUNNING', filePath: '' } });

  try {
    const { order, byName } = buildTableInfo();
    const sql = buildSnapshotSql(order);
    const [result] = await client.$queryRawUnsafe(sql);
    const tables = result.snapshot;

    const snapshot = { version: SNAPSHOT_VERSION, exportedAt: new Date().toISOString(), tables };
    const gz = gzipSync(JSON.stringify(snapshot));
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const filePath = path.join(BACKUP_DIR, `backup-${kind}-${snapshotFileStamp()}.json.gz`);
    fs.writeFileSync(filePath, gz);

    const rowCounts = Object.fromEntries(order.map((name) => [name, tables[name] ? tables[name].length : 0]));
    await client.backup.update({
      where: { id: record.id },
      data: { status: 'SUCCESS', filePath, sizeBytes: gz.length, rowCounts }
    });

    await pruneBackups({ client });
    return { id: record.id, kind, status: 'SUCCESS', filePath, sizeBytes: gz.length, rowCounts };
  } catch (err) {
    await client.backup
      .update({ where: { id: record.id }, data: { status: 'FAILED', error: err.message } })
      .catch(() => {});
    throw err;
  }
}

export async function listBackups({ page = 1, limit = 20, kind = null, client = prisma } = {}) {
  const where = kind ? { kind } : {};
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 20)));
  const [total, items] = await Promise.all([
    client.backup.count({ where }),
    client.backup.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit
    })
  ]);
  return { total, page: safePage, limit: safeLimit, pages: Math.ceil(total / safeLimit), items };
}

/**
 * Delete the oldest backup snapshots beyond the configured retention window
 * (files removed as well). Always keeps at least one snapshot.
 */
export async function pruneBackups({ client = prisma } = {}) {
  const retention = Number(await getConfig('backupRetentionCount', 14, client));
  const keep = Math.max(1, Number.isFinite(retention) ? retention : 14);
  const outdated = await client.backup.findMany({
    orderBy: { createdAt: 'desc' },
    skip: keep,
    select: { id: true, filePath: true }
  });
  for (const row of outdated) {
    await client.backup.delete({ where: { id: row.id } }).catch(() => {});
    if (row.filePath) fs.rmSync(row.filePath, { force: true });
  }
  return outdated.length;
}

/**
 * Locate the most recent successful snapshot taken at or before `at` —
 * the logical equivalent of a point-in-time recovery.
 */
export async function resolveSnapshotBefore(at, { client = prisma } = {}) {
  const time = new Date(at);
  if (Number.isNaN(time.getTime())) {
    const err = new Error('Invalid point-in-time value');
    err.status = 400;
    throw err;
  }
  return client.backup.findFirst({
    where: { status: 'SUCCESS', createdAt: { lte: time } },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Restore the database from a snapshot. Requires explicit confirmation. The
 * wipe-and-replay runs as a single atomic SQL DO block, so a mid-restore
 * failure leaves the database untouched.
 */
export async function restoreBackup(id, { confirm = false, client = prisma } = {}) {
  if (!confirm) {
    const err = new Error('Restore requires confirm=true');
    err.status = 400;
    throw err;
  }
  const record = await client.backup.findUnique({ where: { id } });
  if (!record) {
    const err = new Error('Backup not found');
    err.status = 404;
    throw err;
  }
  if (record.status !== 'SUCCESS') {
    const err = new Error('Only SUCCESS backups can be restored');
    err.status = 400;
    throw err;
  }

  let snapshot;
  try {
    snapshot = JSON.parse(gunzipSync(fs.readFileSync(record.filePath)).toString('utf8'));
  } catch (err) {
    err.status = 400;
    throw err;
  }

  const { order, byName } = buildTableInfo();
  const sql = buildRestoreSql(order, byName, snapshot.tables);
  await client.$executeRawUnsafe(sql);
  const updated = await client.backup.update({ where: { id }, data: { restoredAt: new Date() } });
  return { id, restoredAt: updated.restoredAt };
}

function parseHhMm(value) {
  const [h, m] = String(value).split(':').map(Number);
  return { h: Number.isFinite(h) ? h : 2, m: Number.isFinite(m) ? m : 0 };
}

function scheduleInstant(date, hhmm) {
  const { h, m } = parseHhMm(hhmm);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), h, m, 0, 0));
}

/**
 * Evaluate whether the daily/weekly backups are due and run them if so.
 * Safe to call repeatedly — a successful backup for the period suppresses
 * further triggers until the next scheduled instant.
 */
export async function tickBackupScheduler({ client = prisma } = {}) {
  const enabled = await getConfig('backupScheduleEnabled', true, client);
  if (!enabled) return { triggered: false, reason: 'disabled' };

  const now = new Date();
  const dailyTime = await getConfig('backupDailyTimeUtc', '02:00', client);
  const weeklyDay = Number(await getConfig('backupWeeklyDay', 0, client));

  const todayInstant = scheduleInstant(now, dailyTime);
  const daysSinceWeekStart = (now.getUTCDay() - weeklyDay + 7) % 7;
  const weekStartInstant = new Date(todayInstant);
  weekStartInstant.setUTCDate(todayInstant.getUTCDate() - daysSinceWeekStart);

  const [lastDaily, lastWeekly] = await Promise.all([
    client.backup.findFirst({
      where: { kind: 'DAILY', status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    }),
    client.backup.findFirst({
      where: { kind: 'WEEKLY', status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    })
  ]);

  const kinds = [];
  if (now >= todayInstant && (!lastDaily || lastDaily.createdAt < todayInstant)) kinds.push('DAILY');
  if (now >= weekStartInstant && (!lastWeekly || lastWeekly.createdAt < weekStartInstant)) kinds.push('WEEKLY');

  for (const kind of kinds) {
    try {
      await createBackup(kind, { client });
    } catch (err) {
      console.error(`[backupCron] ${kind} backup failed:`, err.message);
    }
  }
  return { triggered: kinds.length > 0, kinds };
}

let timer = null;

export function startBackupCron(intervalMs = 60_000) {
  if (timer) return timer;
  timer = setInterval(() => {
    tickBackupScheduler().catch((err) => console.error('[backupCron]', err));
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}

export function stopBackupCron() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
