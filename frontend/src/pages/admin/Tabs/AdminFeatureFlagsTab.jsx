import React, { useCallback, useEffect, useState } from 'react';
import { api as apiClient } from '../../../utils/apiClient';

/**
 * Feature Flags — admin toggles that take effect within ~30s without a redeploy.
 * Backed by GET/PUT /admin/feature-flags (registry in services/featureFlagsService.js).
 */
export default function AdminFeatureFlagsTab() {
  const [flags, setFlags] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [savingKey, setSavingKey] = useState(null);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('ok');

  const load = useCallback(async () => {
    setLoaded(false);
    const res = await apiClient.get('/admin/feature-flags');
    const list = res.ok && Array.isArray(res.data?.flags) ? res.data.flags : [];
    setFlags(list);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (tone, text) => {
    setMessageTone(tone);
    setMessage(text);
    window.setTimeout(() => setMessage(''), 4000);
  };

  const setDraftValue = (key, value) => {
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, value } : f)));
  };

  const save = async (key) => {
    const flag = flags.find((f) => f.key === key);
    if (!flag) return;
    setSavingKey(key);
    const res = await apiClient.put(`/admin/feature-flags/${key}`, { value: flag.value });
    setSavingKey(null);
    if (res.ok) {
      setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, ...res.data } : f)));
      flash('ok', `Saved "${flag.label}".`);
    } else {
      flash('bad', res.error?.message || 'Failed to save feature flag.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Feature Flags</h2>
        <p className="text-slate-500 text-xs">
          Runtime toggles applied without a redeploy. Changes take effect within 30s (config cache TTL).
        </p>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-2 text-xs font-semibold ${messageTone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {message}
        </div>
      )}

      <div className="space-y-3">
        {!loaded && <p className="text-slate-400 text-sm">Loading flags…</p>}
        {flags.map((flag) => (
          <div key={flag.key} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900">{flag.label}</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{flag.key}</span>
              </div>
              <p className="text-slate-500 text-xs mt-1">{flag.description}</p>
              {flag.updatedBy && (
                <p className="text-slate-400 text-[10px] mt-1">
                  Last updated {flag.updatedAt ? new Date(flag.updatedAt).toLocaleString() : ''}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {flag.valueType === 'boolean' ? (
                <button
                  onClick={() => {
                    setDraftValue(flag.key, !flag.value);
                    save(flag.key);
                  }}
                  disabled={savingKey === flag.key}
                  className={`relative w-12 h-7 rounded-full transition-colors ${flag.value ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  aria-label={`Toggle ${flag.label}`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${flag.value ? 'left-6' : 'left-1'}`} />
                </button>
              ) : (
                <input
                  type="number"
                  value={flag.value ?? ''}
                  onChange={(e) => setDraftValue(flag.key, Number(e.target.value))}
                  className="w-24 border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-800"
                />
              )}

              <button
                onClick={() => save(flag.key)}
                disabled={savingKey === flag.key}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {savingKey === flag.key ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
