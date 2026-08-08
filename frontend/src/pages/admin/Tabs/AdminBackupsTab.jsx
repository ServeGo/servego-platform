import React, { useCallback, useEffect, useState } from 'react';
import { api as apiClient, API_BASE_URL, getStoredTokens } from '../../../utils/apiClient';

const KIND_STYLES = {
  DAILY: 'bg-sky-100 text-sky-700',
  WEEKLY: 'bg-indigo-100 text-indigo-700',
  MANUAL: 'bg-slate-100 text-slate-600'
};

/**
 * Database Backups — logical snapshots created by services/backupService.js.
 * Lists the manifest (daily/weekly/manual), lets the admin take a snapshot now,
 * download or restore one, run a point-in-time recovery, and configure the
 * automatic schedule via AdminConfig.
 */
export default function AdminBackupsTab() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('ok');
  const [schedule, setSchedule] = useState({ backupScheduleEnabled: true, backupDailyTimeUtc: '02:00', backupWeeklyDay: 0, backupRetentionCount: 14 });
  const [restoreAt, setRestoreAt] = useState('');
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoaded(false);
    const res = await apiClient.get(`/admin/backups?page=${page}&limit=${LIMIT}`);
    if (res.ok) {
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } else {
      setItems([]);
      setTotal(0);
    }
    setLoaded(true);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const loadSchedule = useCallback(async () => {
    const res = await apiClient.get('/admin/configs');
    if (!res.ok) return;
    const cfg = res.data || {};
    setSchedule({
      backupScheduleEnabled: cfg.backupScheduleEnabled ?? true,
      backupDailyTimeUtc: cfg.backupDailyTimeUtc ?? '02:00',
      backupWeeklyDay: cfg.backupWeeklyDay ?? 0,
      backupRetentionCount: cfg.backupRetentionCount ?? 14
    });
  }, []);

  useEffect(() => { loadSchedule(); }, [loadSchedule]);

  const flash = (tone, text) => {
    setMessageTone(tone);
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const createNow = async () => {
    setBusy(true);
    const res = await apiClient.post('/admin/backups');
    setBusy(false);
    if (res.ok) {
      flash('ok', `Snapshot created (${(res.data.backup.sizeBytes / 1024).toFixed(1)} KB).`);
      load();
    } else {
      flash('bad', res.error?.message || 'Failed to create backup.');
    }
  };

  const download = async (id, filename) => {
    try {
      const { access } = getStoredTokens();
      const res = await fetch(`${API_BASE_URL}/admin/backups/${id}/download`, {
        headers: access ? { Authorization: `Bearer ${access}` } : {}
      });
      if (!res.ok) {
        flash('bad', 'Failed to download backup.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `backup-${id}.json.gz`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      flash('bad', 'Failed to download backup.');
    }
  };

  const restore = async (id) => {
    const ok = window.confirm('Restore the database to this snapshot? This replaces all current data.');
    if (!ok) return;
    setBusy(true);
    const res = await apiClient.post(`/admin/backups/${id}/restore`, { confirm: true });
    setBusy(false);
    if (res.ok) flash('ok', 'Database restored from snapshot.');
    else flash('bad', res.error?.message || 'Restore failed.');
  };

  const restoreAtTime = async () => {
    if (!restoreAt) return;
    const ok = window.confirm(`Point-in-time restore to the newest snapshot at/before ${restoreAt}? This replaces all current data.`);
    if (!ok) return;
    setBusy(true);
    const res = await apiClient.post('/admin/backups/restore-at', { at: restoreAt, confirm: true });
    setBusy(false);
    if (res.ok) flash('ok', `Restored to snapshot from ${new Date(res.data.backup.createdAt).toLocaleString()}.`);
    else flash('bad', res.error?.message || 'Point-in-time restore failed.');
  };

  const saveSchedule = async (key) => {
    const res = await apiClient.put(`/admin/configs/${key}`, { value: schedule[key] });
    if (res.ok) flash('ok', 'Backup schedule saved.');
    else flash('bad', res.error?.message || 'Failed to save schedule setting.');
  };

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Database Backups</h2>
        <p className="text-slate-500 text-xs">
          Logical snapshots of every table. Automatic daily (UTC {schedule.backupDailyTimeUtc}) and weekly runs, plus manual backups.
        </p>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-2 text-xs font-semibold ${messageTone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {message}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-extrabold text-slate-900">Schedule</p>
          <label className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-600">Automatic backups</span>
            <button
              onClick={() => { setSchedule((s) => ({ ...s, backupScheduleEnabled: !s.backupScheduleEnabled })); saveSchedule('backupScheduleEnabled'); }}
              className={`relative w-11 h-6 rounded-full transition-colors ${schedule.backupScheduleEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
              aria-label="Toggle automatic backups"
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${schedule.backupScheduleEnabled ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-600">Daily time (UTC)</span>
            <input
              type="time"
              value={schedule.backupDailyTimeUtc}
              onChange={(e) => setSchedule((s) => ({ ...s, backupDailyTimeUtc: e.target.value }))}
              onBlur={() => saveSchedule('backupDailyTimeUtc')}
              className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-600">Weekly day (0 = Sunday)</span>
            <input
              type="number"
              min="0"
              max="6"
              value={schedule.backupWeeklyDay}
              onChange={(e) => setSchedule((s) => ({ ...s, backupWeeklyDay: Number(e.target.value) }))}
              onBlur={() => saveSchedule('backupWeeklyDay')}
              className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-600">Retention (snapshots)</span>
            <input
              type="number"
              min="1"
              value={schedule.backupRetentionCount}
              onChange={(e) => setSchedule((s) => ({ ...s, backupRetentionCount: Number(e.target.value) }))}
              onBlur={() => saveSchedule('backupRetentionCount')}
              className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
            />
          </label>
          <button
            onClick={createNow}
            disabled={busy}
            className="w-full px-3 py-2 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Back up now'}
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-extrabold text-slate-900">Point-in-time restore</p>
          <p className="text-[11px] text-slate-500">
            Restores the newest successful snapshot taken at or before the chosen time. Destructive.
          </p>
          <input
            type="datetime-local"
            value={restoreAt}
            onChange={(e) => setRestoreAt(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
          />
          <button
            onClick={restoreAtTime}
            disabled={busy || !restoreAt}
            className="w-full px-3 py-2 rounded-xl text-xs font-black bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50"
          >
            Restore to point in time
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-extrabold text-slate-900">Snapshots ({total})</p>
        </div>
        {!loaded && <p className="px-4 py-4 text-slate-400 text-sm">Loading backups…</p>}
        {loaded && items.length === 0 && <p className="px-4 py-4 text-slate-400 text-sm">No backups yet.</p>}
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-bold">Kind</th>
              <th className="px-4 py-2 font-bold">Status</th>
              <th className="px-4 py-2 font-bold">Created</th>
              <th className="px-4 py-2 font-bold">Size</th>
              <th className="px-4 py-2 font-bold">Restored</th>
              <th className="px-4 py-2 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${KIND_STYLES[b.kind] || KIND_STYLES.MANUAL}`}>{b.kind}</span>
                </td>
                <td className="px-4 py-2">
                  <span className={`font-bold ${b.status === 'SUCCESS' ? 'text-emerald-600' : b.status === 'FAILED' ? 'text-rose-600' : 'text-slate-500'}`}>
                    {b.status}
                  </span>
                  {b.error && <span className="block text-rose-400 text-[10px]">{b.error}</span>}
                </td>
                <td className="px-4 py-2 text-slate-600">{new Date(b.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2 text-slate-600">{b.sizeBytes ? (b.sizeBytes / 1024).toFixed(1) + ' KB' : '—'}</td>
                <td className="px-4 py-2 text-slate-600">{b.restoredAt ? new Date(b.restoredAt).toLocaleString() : '—'}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => download(b.id, b.filePath?.split(/[\\/]/).pop())} className="text-indigo-600 hover:underline font-bold">Download</button>
                  <button
                    onClick={() => restore(b.id)}
                    disabled={busy || b.status !== 'SUCCESS'}
                    className="text-rose-600 hover:underline font-bold disabled:opacity-40"
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-40"
            >
              ‹ Prev
            </button>
            <span className="text-[10px] text-slate-500">Page {page} of {pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-40"
            >
              Next ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
