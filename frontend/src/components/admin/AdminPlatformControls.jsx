import React, { useCallback, useEffect, useState } from 'react';
import { api as apiClient } from '../../utils/apiClient';
import { cachedRequest, invalidateCache } from '../../utils/requestCache';

/**
 * Platform controls (admin Settings):
 *   - maintenance mode and live tracking (on/off)
 * Backed by the plain /admin/configs endpoints (AdminConfig table, ~30s cache).
 * Referral bonus and the announcement banner live in the Feature Flags tab.
 */

const DEFAULTS = {
  maintenanceMode: false,
  locationTrackingEnabled: true
};

const BOOLEAN_CARDS = [
  {
    key: 'maintenanceMode',
    label: 'Maintenance Mode',
    description: 'Takes the public site offline (503) — admin routes, login and feature-flag reads stay reachable so it can be switched back on. Turn ON to take the site down.',
    danger: true
  },
  {
    key: 'locationTrackingEnabled',
    label: 'Live Location Tracking',
    description: 'Lets providers share live location on active bookings and shows their moving marker to customers. Turn OFF to disable live tracking platform-wide.',
    danger: false
  }
];

function Card({ children }) {
  return <div className="bg-white border border-slate-200 rounded-2xl p-4">{children}</div>;
}

function ToggleButton({ label, value, saving, onToggle }) {
  return (
    <button
      onClick={onToggle}
      disabled={saving}
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${value ? 'bg-emerald-500' : 'bg-slate-300'} ${saving ? 'opacity-60' : ''}`}
      aria-label={`Toggle ${label}`}
      title={`${label} is currently ${value ? 'ON' : 'OFF'}`}
    >
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

function BooleanCard({ item, value, saving, onToggle }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-extrabold text-slate-900">{item.label}</p>
            {item.danger && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">high risk</span>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-1">{item.description}</p>
        </div>
        <ToggleButton label={item.label} value={value} saving={saving} onToggle={() => onToggle(item)} />
      </div>
    </Card>
  );
}

export default function AdminPlatformControls() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [savingKey, setSavingKey] = useState(null);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('ok');

  const load = useCallback(async () => {
    setLoaded(false);
    setLoadError('');
    // Backend already serves this with a ~30s cache, so the frontend promise
    // cache dedupes admin sections that both read /admin/configs (Platform
    // Controls + Config tab) without adding freshness risk.
    const res = await cachedRequest('admin-configs', () => apiClient.get('/admin/configs'));
    if (res.ok && res.data && typeof res.data === 'object') {
      const merged = { ...DEFAULTS };
      for (const key of Object.keys(DEFAULTS)) {
        if (res.data[key] !== undefined && res.data[key] !== null) merged[key] = res.data[key];
      }
      setSettings(merged);
    } else {
      setLoadError(res.error?.message || 'Failed to load platform settings.');
    }
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (tone, text) => {
    setMessageTone(tone);
    setMessage(text);
    window.setTimeout(() => setMessage(''), 4000);
  };

  const save = async (key, value) => {
    setSavingKey(key);
    const res = await apiClient.put(`/admin/configs/${key}`, { value });
    setSavingKey(null);
    if (res.ok) {
      invalidateCache('admin-configs');
      setSettings((prev) => ({ ...prev, [key]: value }));
      flash('ok', 'Saved.');
    } else {
      flash('bad', res.error?.message || 'Failed to save setting.');
    }
  };

  const toggle = (item) => {
    const turningOn = !settings[item.key];
    if (item.danger && turningOn) {
      const ok = window.confirm(
        `Turn ON "${item.label}"?\n\nThis flag can take the site offline or disrupt live traffic. Only enable it if you are sure.`
      );
      if (!ok) return;
    }
    save(item.key, turningOn);
  };

  return (
    <div className="space-y-6">
      <div className="border-t border-slate-200 pt-8">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Platform Controls</h2>
        <p className="text-slate-500 text-xs mt-1">
          Operational toggles. Referral payout and the announcement banner live on the Feature Flags tab. Changes take effect within ~30s (config cache TTL).
        </p>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-2 text-xs font-semibold ${messageTone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {message}
        </div>
      )}

      {loadError && (
        <div className="rounded-xl px-4 py-3 text-xs font-semibold bg-rose-50 text-rose-700 flex items-center justify-between">
          <span>{loadError}</span>
          <button onClick={load} className="px-3 py-1 rounded-lg bg-rose-600 text-white hover:bg-rose-500">Retry</button>
        </div>
      )}

      {!loaded && !loadError && <p className="text-slate-400 text-sm">Loading settings…</p>}

      <div className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-600">Operations</h3>
        {BOOLEAN_CARDS.map((item) => (
          <BooleanCard
            key={item.key}
            item={item}
            value={settings[item.key]}
            saving={savingKey === item.key}
            onToggle={toggle}
          />
        ))}
      </div>
    </div>
  );
}
