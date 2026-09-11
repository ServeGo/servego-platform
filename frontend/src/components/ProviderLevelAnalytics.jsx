import React, { useEffect, useState, useCallback } from 'react';
import {
  Crown,
  Star,
  TrendingUp,
  Snowflake,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Percent,
  Clock,
  Users,
  CalendarDays
} from 'lucide-react';
import { useData, useRealtime } from '../context/AppContext';
import { api } from '../utils/apiClient';
import { cachedRequest } from '../utils/requestCache';

const LEVEL_META = {
  BRONZE: { color: 'bg-orange-900/90', ring: 'ring-orange-500/40', text: 'text-orange-300', banner: 'from-orange-800 via-amber-900 to-orange-950' },
  SILVER: { color: 'bg-slate-500', ring: 'ring-slate-400/40', text: 'text-slate-200', banner: 'from-slate-600 via-slate-700 to-slate-900' },
  GOLD: { color: 'bg-amber-500', ring: 'ring-amber-400/40', text: 'text-amber-200', banner: 'from-amber-600 via-amber-700 to-amber-900' },
  PLATINUM: { color: 'bg-teal-600', ring: 'ring-teal-400/40', text: 'text-teal-200', banner: 'from-teal-600 via-teal-700 to-teal-900' },
  DIAMOND: { color: 'bg-sky-500', ring: 'ring-sky-400/40', text: 'text-sky-200', banner: 'from-sky-600 via-sky-700 to-sky-900' }
};

const fmtMoneyIn = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

function formatMs(ms) {
  const num = Number(ms) || 0;
  if (!num) return '—';
  if (num < 1000) return `${Math.round(num)} ms`;
  return `${(num / 1000).toFixed(1)} s`;
}

function Stat({ label, value, hint, icon: Icon, colorClass }) {
  return (
    <div className={`rounded-2xl sm:rounded-3xl border ${colorClass} p-3 sm:p-4 bg-white min-w-0`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-slate-400 leading-snug break-words">{label}</div>
          <div className="mt-1.5 sm:mt-2 text-base sm:text-lg font-black text-slate-900 leading-snug break-words">{value}</div>
          {hint ? <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 font-semibold leading-snug break-words">{hint}</div> : null}
        </div>
        {Icon ? <Icon className="w-5 h-5 text-slate-300 shrink-0" /> : null}
      </div>
    </div>
  );
}

export default function ProviderLevelAnalytics({ providerId }) {
  const { socketRef } = useRealtime();
  const { fetchProviderAnalytics } = useData();

  // Lifetime performance + levels
  const [data, setData] = useState(null);
  const [rules, setRules] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Lifetime analytics — no range filter, shows everything since joining.
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const load = useCallback(async ({ force = false } = {}) => {
    if (!providerId) return;
    setLoading(true);
    try {
      const [perf, rulesRes, promos] = await Promise.all([
        cachedRequest('provider-performance/me', () => api.get('/provider-performance/me'), { force }),
        cachedRequest('level-rules', () => api.get('/level-rules'), { force }),
        cachedRequest('promotions/me', () => api.get('/promotions/me'), { force })
      ]);
      if (perf.ok) setData(perf.data);
      if (rulesRes.ok) setRules(Array.isArray(rulesRes.data) ? rulesRes.data : []);
      if (promos.ok) setPromotions(Array.isArray(promos.data) ? promos.data : []);
      setError('');
    } catch (e) {
      setError('Failed to load performance data.');
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    // force bypasses the 30s request cache so opening the tab always shows
    // the live snapshot instead of the dashboard's pre-warmed copy.
    load({ force: true });
  }, [load]);

  // Live refresh when a promotion is pushed to this provider's room.
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return undefined;
    const handler = () => load({ force: true });
    socket.on('promotion', handler);
    return () => socket.off('promotion', handler);
  }, [socketRef, load]);

  // Resync whenever the provider's bookings change (work completed, accepted,
  // cancelled...) or a job completes. Also self-heal periodically so the tab
  // never shows stale numbers while left open.
  useEffect(() => {
    const socket = socketRef?.current;
    const refresh = () => {
      setRefreshTick((t) => t + 1);
      load({ force: true }).catch(() => {});
    };
    if (socket) {
      socket.on('bookingStatusChanged', refresh);
      socket.on('bookingUpdated', refresh);
      socket.on('jobCompleted', refresh);
    }
    const interval = setInterval(() => setRefreshTick((t) => t + 1), 20000);
    return () => {
      if (socket) {
        socket.off('bookingStatusChanged', refresh);
        socket.off('bookingUpdated', refresh);
        socket.off('jobCompleted', refresh);
      }
      clearInterval(interval);
    };
  }, [socketRef, load]);

  // Analytics — refetch on mount and whenever bookings change.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoadingAnalytics(true);
      let result = await fetchProviderAnalytics(providerId, 'all');
      // If the running backend rejects/doesn't support `range=all` yet (it needs
      // to be restarted), degrade to 90d instead of showing a permanently empty
      // dashboard. Once `all` succeeds, the lifetime numbers replace them.
      if (!result) result = await fetchProviderAnalytics(providerId, '90d');
      if (!cancelled) {
        // Keep the last successful snapshot on a transient failure instead of
        // wiping the charts to zeros, which read as "analytics stopped".
        if (result) setAnalytics(result);
        setLoadingAnalytics(false);
      }
    };
    if (providerId) run();
    else {
      setAnalytics(null);
      setLoadingAnalytics(false);
    }
    return () => {
      cancelled = true;
    };
  }, [providerId, refreshTick, fetchProviderAnalytics]);

  const handleAcknowledge = async (promotionId) => {
    try {
      const res = await api.post(`/promotions/${promotionId}/acknowledge`, {});
      if (res.ok) await load({ force: true });
    } catch {
      // ignore — refresh will resync
    }
  };

  const handleRefresh = () => {
    // Refresh BOTH the performance snapshot (force) and the analytics (tick),
    // so one tap always re-syncs everything on screen.
    load({ force: true });
    setRefreshTick((t) => t + 1);
  };

  const provider = data?.provider;
  const performance = data?.performance || {};
  const inCooldown = Boolean(performance.cooldownUntil && new Date(performance.cooldownUntil) > new Date());
  const unacknowledged = promotions.filter((p) => !p.acknowledged);

  // Jobs-based level (BRONZE → DIAMOND)
  const levelOrder = Array.isArray(data?.levelOrder) ? data.levelOrder : ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
  const currentLevel = provider?.providerLevel || 'BRONZE';
  const levelIdx = Math.max(0, levelOrder.indexOf(currentLevel));
  const nextLevel = levelOrder[levelIdx + 1] || null;
  const nextRule = rules.find((r) => r.level === nextLevel);
  const jobsCompleted = Number(provider?.jobsCompleted || 0);
  const nextThreshold = nextRule ? Number(nextRule.minJobs) : null;
  const levelProgress = nextThreshold ? Math.min(100, Math.round((jobsCompleted / nextThreshold) * 100)) : 100;

  const totals = analytics?.totals || {};
  const dailyEarnings = Array.isArray(analytics?.dailyEarnings) ? analytics.dailyEarnings : [];

  const acceptancePct = Math.round((totals.acceptanceRate || 0) * 100);
  const cancellationPct = Math.round((totals.cancellationRate || 0) * 100);
  const completionPct = Math.round((totals.completionRate || 0) * 100);
  const retentionPct = Math.round((totals.retentionRate || 0) * 100);

  if (loading && !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-400 text-xs font-semibold">
        Loading your performance dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-tight text-left">Analytics</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 font-semibold mt-1">
              Lifetime earnings, booking analytics and performance insights.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="shrink-0 self-start bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {unacknowledged.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6">
          {unacknowledged.map((p) => (
            <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center">
                  <Crown className="w-6 h-6" />
                </span>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">
                    Promoted to {p.toLevel}!
                  </h4>
                  <p className="text-xs text-slate-600 font-semibold">
                    Reached at {p.completedJobsAtPromotion} completed jobs — you now enjoy higher ranking priority and plan discounts.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleAcknowledge(p.id)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all"
              >
                Celebrate
              </button>
            </div>
          ))}
        </div>
      )}

      {inCooldown && (
        <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold rounded-2xl px-4 py-3">
          <Snowflake className="w-4 h-4 shrink-0" />
          You are paused due to repeated cancellations until {fmtDate(performance.cooldownUntil)}. New leads resume automatically after that.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <h4 className="text-sm font-extrabold text-slate-900">Analytics</h4>
        </div>
        <p className="text-xs text-slate-500 font-semibold mb-4">Lifetime operational metrics beyond reputation — since the day you joined.</p>

        {loadingAnalytics ? (
          <p className="text-xs text-slate-500 font-semibold">Loading analytics…</p>
        ) : null}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            label="Total earnings"
            value={fmtMoneyIn(totals.totalEarnings)}
            hint="paid bookings"
            icon={TrendingUp}
            colorClass="bg-indigo-50 border-indigo-200"
          />
          <Stat
            label="Completion rate"
            value={`${completionPct}%`}
            hint="completed ÷ terminal outcomes"
            icon={ShieldCheck}
            colorClass="bg-emerald-50 border-emerald-200"
          />
          <Stat
            label="Acceptance rate"
            value={`${acceptancePct}%`}
            hint="confirmed/ongoing/completed"
            icon={Percent}
            colorClass="bg-amber-50 border-amber-200"
          />
          <Stat
            label="Cancellation rate"
            value={`${cancellationPct}%`}
            hint="cancelled offers"
            icon={CalendarDays}
            colorClass="bg-rose-50 border-rose-200"
          />

          <Stat
            label="Avg response time"
            value={formatMs(totals.avgResponseTimeMs)}
            hint="approx. booking update latency"
            icon={Clock}
            colorClass="bg-slate-50 border-slate-200"
          />

          <Stat
            label="Customer retention"
            value={`${retentionPct}%`}
            hint="repeat customers (≥2 bookings)"
            icon={Users}
            colorClass="bg-purple-50 border-purple-200"
          />

          <Stat
            label="Repeat customers"
            value={totals.repeatCustomers ?? 0}
            hint="since joining"
            icon={Users}
            colorClass="bg-teal-50 border-teal-200"
          />

          <Stat
            label="Total customers"
            value={totals.customerCount ?? 0}
            hint="unique customers"
            icon={Users}
            colorClass="bg-sky-50 border-sky-200"
          />
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 mt-6">
          <h4 className="font-extrabold text-slate-800 text-sm">Earnings by date</h4>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Net earnings on completed bookings for each service date since you joined.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs font-bold">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Bookings</th>
                  <th className="py-2.5 text-right">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {dailyEarnings.length ? (
                  dailyEarnings.map((d) => (
                    <tr key={d.date}>
                      <td className="py-3 font-mono text-slate-900">{fmtDate(d.date)}</td>
                      <td className="py-3">{d.bookings}</td>
                      <td className="py-3 text-right font-black text-emerald-700">{fmtMoneyIn(d.earnings)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-xs text-slate-400 font-semibold">
                      No completed bookings yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Levels */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-4 h-4 text-amber-500" />
          <h4 className="text-sm font-extrabold text-slate-900">Your Levels</h4>
          <span className="text-[10px] text-slate-400 font-semibold">— jobs-based, no subscription tiers</span>
        </div>

        <div className={`rounded-3xl p-6 text-white bg-gradient-to-br ${LEVEL_META[currentLevel]?.banner}`}>
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="flex items-center gap-3">
              <span className={`w-12 h-12 rounded-2xl ring-2 ${LEVEL_META[currentLevel]?.color} ${LEVEL_META[currentLevel]?.ring} flex items-center justify-center shadow-lg`}>
                <Crown className="w-6 h-6 text-white" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-black text-white/70 mb-1">Jobs Level</p>
                <h4 className="text-2xl font-black">{currentLevel}</h4>
                <p className="text-[11px] text-white/70 font-bold uppercase tracking-wider">Based on completed jobs</p>
              </div>
            </div>
            {nextLevel ? (
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest font-black text-white/70">
                    Next: <span className={`${LEVEL_META[nextLevel]?.text}`}>{nextLevel}</span>
                  </span>
                  <span className="text-[10px] font-black text-white">
                    {jobsCompleted}{nextThreshold != null ? ` / ${nextThreshold}` : ''} jobs
                  </span>
                </div>
                <div className="h-2.5 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-white to-white/80 transition-all"
                    style={{ width: `${levelProgress}%` }}
                  />
                </div>
                {nextRule && (
                  <p className="text-[11px] text-white/80 font-semibold mt-1.5">
                    {nextRule.description || `Complete ${nextThreshold} jobs to reach ${nextLevel}.`}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-amber-200 font-bold">Highest level reached — congratulations!</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-amber-500" />
              <h4 className="text-sm font-extrabold text-slate-900">Promotions History ({promotions.length})</h4>
            </div>
            {promotions.length === 0 ? (
              <p className="text-slate-400 text-xs italic p-4 text-center">Complete enough jobs and you will be promoted automatically.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white border-b border-slate-200">
                    <tr>
                      {['From', 'To', 'Jobs', 'Promoted', 'Status'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {promotions.map((p) => (
                      <tr key={p.id} className="hover:bg-white">
                        <td className="px-3 py-2 font-bold text-slate-700">{p.fromLevel}</td>
                        <td className="px-3 py-2 font-black text-slate-900">{p.toLevel}</td>
                        <td className="px-3 py-2 text-slate-600">{p.completedJobsAtPromotion}</td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{fmtDate(p.promotedAt)}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            p.acknowledged ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-300'
                          }`}>
                            {p.acknowledged ? 'Celebrated' : 'New'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
