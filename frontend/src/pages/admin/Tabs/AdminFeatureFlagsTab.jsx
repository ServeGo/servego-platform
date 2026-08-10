import React, { useCallback, useEffect, useState } from 'react';
import { api as apiClient } from '../../../utils/apiClient';

/**
 * Feature Flags (admin):
 *   - referralBonusAmount: the referral payout, applied to every referral.
 *   - New Feature Announcement: one "what's new" banner, targeted to a single
 *     audience (customers OR providers) with the message the admin types.
 * Backed by the /feature-flags endpoints (AdminConfig table, ~30s cache).
 */

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

export default function AdminFeatureFlagsTab() {
  const [flags, setFlags] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [savingKey, setSavingKey] = useState(null);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('ok');

  const load = useCallback(async () => {
    setLoaded(false);
    setLoadError('');
    const res = await apiClient.get('/feature-flags');
    if (res.ok && Array.isArray(res.data?.flags)) {
      setFlags(res.data.flags);
    } else {
      setLoadError(res.error?.message || 'Failed to load feature flags.');
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
    const res = await apiClient.put(`/feature-flags/${key}`, { value });
    setSavingKey(null);
    if (res.ok) {
      setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, ...res.data, value: res.data.value } : f)));
      flash('ok', 'Saved.');
    } else {
      flash('bad', res.error?.message || 'Failed to save flag.');
    }
  };

  const get = (key, fallback) => flags.find((f) => f.key === key)?.value ?? fallback;

  const announcementEnabled = get('newFeatureEnabled', false) === true;
  const announcementAudience = get('newFeatureAudience', 'customer');
  const announcementText = get('newFeatureText', '');
  const referralAmount = get('referralBonusAmount', 250);

  const setValue = (key, value) => setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, value } : f)));

  return (
    <div className="space-y-6">
      <div className="border-t border-slate-200 pt-8">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Feature Flags</h2>
        <p className="text-slate-500 text-xs mt-1">
          Runtime toggles that apply without a redeploy. Changes take effect within ~30s (config cache TTL).
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

      {!loaded && !loadError && <p className="text-slate-400 text-sm">Loading feature flags…</p>}

      <div className="space-y-8">
        <div className="space-y-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-600">Growth</h3>
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-900">Referral Bonus Amount (₹)</p>
                <p className="text-slate-500 text-xs mt-1">Bonus credited to a new user when they apply a referral code. Applies to every referral.</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={1}
                value={referralAmount ?? ''}
                onChange={(e) => setValue('referralBonusAmount', e.target.value === '' ? '' : Number(e.target.value))}
                onKeyDown={(e) => { if (e.key === 'Enter') save('referralBonusAmount', Number(referralAmount)); }}
                disabled={savingKey === 'referralBonusAmount'}
                className="w-32 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 disabled:opacity-60"
              />
              <button
                onClick={() => save('referralBonusAmount', Number(referralAmount))}
                disabled={savingKey === 'referralBonusAmount'}
                className="px-3 py-2 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {savingKey === 'referralBonusAmount' ? 'Saving…' : 'Save'}
              </button>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-600">Marketing</h3>
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-900">New Feature Announcement</p>
                <p className="text-slate-500 text-xs mt-1">Shows a "what&rsquo;s new" headline to the selected audience for 24 hours. Turning it on (or editing the audience/message while it&rsquo;s on) restarts the 24h window.</p>
              </div>
              <ToggleButton
                label="New Feature Announcement"
                value={announcementEnabled}
                saving={savingKey === 'newFeatureEnabled'}
                onToggle={() => save('newFeatureEnabled', !announcementEnabled)}
              />
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Audience</label>
                <select
                  value={announcementAudience}
                  onChange={(e) => save('newFeatureAudience', e.target.value)}
                  disabled={savingKey === 'newFeatureAudience'}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white disabled:opacity-60 cursor-pointer"
                >
                  <option value="customer">Customers</option>
                  <option value="provider">Providers</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Message</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={announcementText}
                    onChange={(e) => setValue('newFeatureText', e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') save('newFeatureText', announcementText); }}
                    disabled={savingKey === 'newFeatureText'}
                    placeholder="e.g. New: chat with your service pro in real time"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 disabled:opacity-60"
                  />
                  <button
                    onClick={() => save('newFeatureText', announcementText)}
                    disabled={savingKey === 'newFeatureText'}
                    className="px-3 py-2 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    {savingKey === 'newFeatureText' ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
