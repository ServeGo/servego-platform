import React, { useEffect, useState, useCallback } from 'react';
import {
  Crown,
  Star,
  Target,
  Zap,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  Snowflake,
  AlertTriangle,
  Award,
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

const pct = (v) => `${Math.round((Number(v) || 0) * 100)}%`;

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

function monthSortKey(m) {
  const [y, mo] = String(m).split('-');
  return Number(y) * 100 + Number(mo);
}

function Stat({ label, value, hint, icon: Icon, colorClass }) {
  return (
    <div className={`rounded-3xl border ${colorClass} p-4 bg-white`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{label}</div>
          <div className="mt-2 text-lg font-black text-slate-900">{value}</div>
          {hint ? <div className="text-[11px] text-slate-500 mt-1 font-semibold">{hint}</div> : null}
        </div>
        {Icon ? <Icon className="w-5 h-5 text-slate-300" /> : null}
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
  const [subHistory, setSubHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Range analytics
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  const load = useCallback(async ({ force = false } = {}) => {
    if (!providerId) return;
    setLoading(true);
    try {
      const [perf, rulesRes, promos, subHistRes] = await Promise.all([
        cachedRequest('provider-performance/me', () => api.get('/provider-performance/me'), { force }),
        cachedRequest('level-rules', () => api.get('/level-rules'), { force }),
        cachedRequest('promotions/me', () => api.get('/promotions/me'), { force }),
        cachedRequest('subscriptions/transactions', () => api.get('/subscriptions/transactions'), { force })
      ]);
      if (perf.ok) setData(perf.data);
      if (rulesRes.ok) setRules(Array.isArray(rulesRes.data) ? rulesRes.data : []);
      if (promos.ok) setPromotions(Array.isArray(promos.data) ? promos.data : []);
      if (subHistRes.ok) setSubHistory(Array.isArray(subHistRes.data) ? subHistRes.data : []);
      setError('');
    } catch (e) {
      setError('Failed to load performance data.');
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    load();
  }, [load]);

  // Live refresh when a promotion is pushed to this provider's room.
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return undefined;
    const handler = () => load({ force: true });
    socket.on('promotion', handler);
    return () => socket.off('promotion', handler);
  }, [socketRef, load]);

  // Analytics — refetch whenever the time range changes.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoadingAnalytics(true);
      const result = await fetchProviderAnalytics(providerId, timeRange);
      if (!cancelled) {
        setAnalytics(result);
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
  }, [providerId, timeRange, fetchProviderAnalytics]);

  const handleAcknowledge = async (promotionId) => {
    try {
      const res = await api.post(`/promotions/${promotionId}/acknowledge`, {});
      if (res.ok) await load({ force: true });
    } catch {
      // ignore — refresh will resync
    }
  };

  const provider = data?.provider;
  const performance = data?.performance || {};
  const inCooldown = Boolean(performance.cooldownUntil && new Date(performance.cooldownUntil) > new Date());
  const unacknowledged = promotions.filter((p) => !p.acknowledged);

  const metrics = [
    { label: 'Acceptance Rate', value: pct(performance.acceptanceRate), icon: ThumbsUp, tone: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { label: 'Response Rate', value: pct(performance.responseRate), icon: Zap, tone: 'text-sky-600 bg-sky-50 border-sky-200' },
    { label: 'Cancellation Rate', value: pct(performance.cancellationRate), icon: ThumbsDown, tone: 'text-rose-600 bg-rose-50 border-rose-200' },
    { label: 'Leads Received', value: performance.totalLeads ?? 0, icon: Target, tone: 'text-teal-600 bg-teal-50 border-teal-200' }
  ];

  // Jobs-based level (BRONZE → DIAMOND)
  const levelOrder = Array.isArray(data?.levelOrder) ? data.levelOrder : ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
  const currentLevel = provider?.providerLevel || 'BRONZE';
  const levelIdx = Math.max(0, levelOrder.indexOf(currentLevel));
  const nextLevel = levelOrder[levelIdx + 1] || null;
  const nextRule = rules.find((r) => r.level === nextLevel);
  const jobsCompleted = Number(provider?.jobsCompleted || 0);
  const nextThreshold = nextRule ? Number(nextRule.minJobs) : null;
  const levelProgress = nextThreshold ? Math.min(100, Math.round((jobsCompleted / nextThreshold) * 100)) : 100;

  // Subscription journey: baseline Level 0 (GENERAL free lead) + purchase history.
  const hasLevelZeroPurchase = subHistory.some((t) => Number(t.levelPurchased) === 0);
  const subJourney = [
    ...(hasLevelZeroPurchase ? [] : [{ _base: true, levelPurchased: 0, planName: 'Free Lead' }]),
    ...subHistory.slice().reverse()
  ];

  const totals = analytics?.totals || {};
  const monthly = Array.isArray(analytics?.monthlyEarnings) ? analytics.monthlyEarnings : [];
  const trends = Array.isArray(analytics?.bookingTrendsByMonth) ? analytics.bookingTrendsByMonth : [];

  const revenueSeries = monthly.map((m) => ({ month: m.month, amount: m.earnings ?? 0 }));
  const revenueMax = Math.max(1, ...revenueSeries.map((d) => Number(d.amount) || 0));
  const trendSeries = trends.slice().sort((a, b) => monthSortKey(a.month) - monthSortKey(b.month));

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
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight text-left">Performance & Analytics</h3>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Acceptance, response and lead performance, plus earnings and booking analytics for the selected range.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="shrink-0 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white border border-slate-200 rounded-2xl p-4">
            <span className={`inline-flex w-8 h-8 rounded-xl border items-center justify-center mb-2 ${m.tone}`}>
              <m.icon className="w-4 h-4" />
            </span>
            <p className="text-xl font-black text-slate-900">{m.value}</p>
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-extrabold text-slate-900">Analytics</h4>
          </div>
          <div className="flex gap-2 bg-slate-50 border border-slate-200 p-1 rounded-2xl">
            {[
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeRange(t.id)}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${timeRange === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-800'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500 font-semibold mb-4">Operational performance metrics beyond reputation.</p>

        {loadingAnalytics ? (
          <p className="text-xs text-slate-500 font-semibold">Loading analytics…</p>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            hint="in selected range"
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
            <h4 className="font-extrabold text-slate-800 text-sm">Revenue by month</h4>
            <p className="text-xs text-slate-500 font-semibold mt-1">Approximation: count of paid bookings per month.</p>
            <div className="mt-4 h-64 flex items-end gap-3 pb-2">
              {revenueSeries.length ? (
                revenueSeries
                  .slice()
                  .sort((a, b) => monthSortKey(a.month) - monthSortKey(b.month))
                  .map((d) => (
                    <div key={d.month} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-indigo-600 hover:bg-slate-900 rounded-t-lg transition-all"
                        style={{ height: `${(Number(d.amount) || 0) / revenueMax * 100}%` }}
                        title={`${d.month}: ${d.amount}`}
                      />
                      <div className="text-[10px] text-slate-500 font-extrabold mt-2">{d.month.slice(5)}</div>
                    </div>
                  ))
              ) : (
                <div className="text-xs text-slate-400 font-semibold">No revenue data for this range.</div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
            <h4 className="font-extrabold text-slate-800 text-sm">Booking trends (by status)</h4>
            <p className="text-xs text-slate-500 font-semibold mt-1">Pending → Confirmed → Completed / Cancelled across months.</p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs font-bold">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5">Month</th>
                    <th className="py-2.5">Pending</th>
                    <th className="py-2.5">Confirmed</th>
                    <th className="py-2.5">Ongoing</th>
                    <th className="py-2.5">Completed</th>
                    <th className="py-2.5">Cancelled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {trendSeries.length ? (
                    trendSeries.map((r) => (
                      <tr key={r.month}>
                        <td className="py-3 font-mono text-slate-900">{r.month}</td>
                        <td className="py-3">{r.pending || 0}</td>
                        <td className="py-3">{r.confirmed || 0}</td>
                        <td className="py-3">{r.ongoing || 0}</td>
                        <td className="py-3 text-emerald-700">{r.completed || 0}</td>
                        <td className="py-3 text-rose-700">{r.cancelled || 0}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-xs text-slate-400 font-semibold">
                        No booking trend data for this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 italic font-semibold mt-6">
          Note: Earnings reflect provider payouts (service amount minus the admin-configured provider platform charge) on completed bookings.
        </p>
      </div>

      {/* Levels */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-4 h-4 text-amber-500" />
          <h4 className="text-sm font-extrabold text-slate-900">Your Levels</h4>
          <span className="text-[10px] text-slate-400 font-semibold">— jobs-based and subscription levels are independent</span>
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
              <Award className="w-4 h-4 text-indigo-500" />
              <h4 className="text-sm font-extrabold text-slate-900">Subscription Journey</h4>
            </div>
            {subJourney.length === 0 ? (
              <p className="text-slate-400 text-xs italic p-4 text-center">No subscription purchases yet.</p>
            ) : (
              <ol className="relative border-l border-slate-200 ml-2 space-y-4">
                {subJourney.map((t, i) => (
                  <li key={t.id || `base-${i}`} className="ml-4 relative">
                    <span className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full ring-4 ${t._base ? 'bg-slate-400 ring-slate-200' : 'bg-indigo-500 ring-indigo-100'}`} />
                    <p className="text-xs font-black text-slate-900 uppercase">
                      Level {t.levelPurchased}{t.planName ? ` · ${t.planName}` : ''}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      {t._base
                        ? 'Started with the free lead plan (GENERAL sector).'
                        : `${fmtDate(t.purchasedAt)} · ${fmtMoneyIn(t.finalAmount)} paid${t.paymentStatus === 'PAID' ? '' : ` · ${t.paymentStatus.toLowerCase()}`}`}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>

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
