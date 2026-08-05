import React, { useState, useEffect, useCallback } from 'react';
import {
  Crown,
  Star,
  Target,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Timer,
  Briefcase,
  Receipt,
  TrendingUp,
  Snowflake,
  IndianRupee,
  AlertTriangle,
  Award,
  RefreshCw,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/apiClient';

const LEVEL_META = {
  BRONZE: { color: 'bg-orange-900/90', ring: 'ring-orange-500/40', text: 'text-orange-300' },
  SILVER: { color: 'bg-slate-500', ring: 'ring-slate-400/40', text: 'text-slate-200' },
  GOLD: { color: 'bg-amber-500', ring: 'ring-amber-400/40', text: 'text-amber-200' },
  PLATINUM: { color: 'bg-teal-600', ring: 'ring-teal-400/40', text: 'text-teal-200' },
  DIAMOND: { color: 'bg-sky-500', ring: 'ring-sky-400/40', text: 'text-sky-200' }
};

const fmtMoney = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—';
};

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const pct = (v) => `${Math.round((Number(v) || 0) * 100)}%`;

export default function ProviderLevelPerformance({ providerId }) {
  const { socketRef } = useApp();
  const [data, setData] = useState(null);
  const [rules, setRules] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!providerId) return;
    setLoading(true);
    try {
      const [perf, rulesRes, promos, hist] = await Promise.all([
        api.get('/provider-performance/me'),
        api.get('/level-rules'),
        api.get('/promotions/me'),
        api.get('/provider-level-history/me')
      ]);
      if (perf.ok) setData(perf.data);
      if (rulesRes.ok) setRules(Array.isArray(rulesRes.data) ? rulesRes.data : []);
      if (promos.ok) setPromotions(Array.isArray(promos.data) ? promos.data : []);
      if (hist.ok) setHistory(Array.isArray(hist.data) ? hist.data : []);
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
    const handler = () => load();
    socket.on('promotion', handler);
    return () => socket.off('promotion', handler);
  }, [socketRef, load]);

  const handleAcknowledge = async (promotionId) => {
    try {
      const res = await api.post(`/promotions/${promotionId}/acknowledge`, {});
      if (res.ok) await load();
    } catch {
      // ignore — refresh will resync
    }
  };

  const provider = data?.provider;
  const performance = data?.performance || {};
  const levelOrder = Array.isArray(data?.levelOrder) ? data.levelOrder : ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
  const currentLevel = provider?.providerLevel || 'BRONZE';
  const levelIdx = Math.max(0, levelOrder.indexOf(currentLevel));
  const nextLevel = levelOrder[levelIdx + 1] || null;
  const nextRule = rules.find((r) => r.level === nextLevel);
  const jobsCompleted = Number(provider?.jobsCompleted || 0);
  const nextThreshold = nextRule ? Number(nextRule.minJobs) : null;
  const progress = nextThreshold ? Math.min(100, Math.round((jobsCompleted / nextThreshold) * 100)) : 100;
  const inCooldown = Boolean(performance.cooldownUntil && new Date(performance.cooldownUntil) > new Date());
  const unacknowledged = promotions.filter((p) => !p.acknowledged);

  const metrics = [
    { label: 'Acceptance Rate', value: pct(performance.acceptanceRate), icon: ThumbsUp, tone: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { label: 'Response Rate', value: pct(performance.responseRate), icon: Zap, tone: 'text-sky-600 bg-sky-50 border-sky-200' },
    { label: 'Cancellation Rate', value: pct(performance.cancellationRate), icon: ThumbsDown, tone: 'text-rose-600 bg-rose-50 border-rose-200' },
    { label: 'Leads Received', value: performance.totalLeads ?? 0, icon: Target, tone: 'text-teal-600 bg-teal-50 border-teal-200' }
  ];

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
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight text-left">Level & Performance</h3>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Your provider level drives ranking priority and plan discounts. Levels advance automatically as you complete jobs.
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

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Current Provider Level</p>
            <div className="flex items-center gap-3">
              <span className={`w-12 h-12 rounded-2xl ring-2 ${LEVEL_META[currentLevel]?.color} ${LEVEL_META[currentLevel]?.ring} flex items-center justify-center`}>
                <Crown className="w-6 h-6 text-white" />
              </span>
              <div>
                <h4 className="text-2xl font-black">{currentLevel}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{provider?.sector || 'GENERAL'} sector</p>
              </div>
            </div>
            {nextLevel ? (
              <div className="mt-5 max-w-md">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                    Next level: <span className={`${LEVEL_META[nextLevel]?.text}`}>{nextLevel}</span>
                  </span>
                  <span className="text-[10px] font-black text-slate-300">
                    {jobsCompleted}{nextThreshold != null ? ` / ${nextThreshold}` : ''} jobs
                  </span>
                </div>
                <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {nextRule && (
                  <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                    {nextRule.description || `Complete ${nextThreshold} jobs to reach ${nextLevel}.`}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-amber-300 font-bold mt-3">Highest level reached — congratulations!</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <p className="text-2xl font-black">{jobsCompleted}</p>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Jobs Done</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <p className="text-2xl font-black">{Number(provider?.rating || 0).toFixed(1)}</p>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Rating</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <p className="text-2xl font-black">{provider?.reviewCount ?? 0}</p>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Reviews</p>
            </div>
          </div>
        </div>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-teal-600" />
            <h4 className="text-sm font-extrabold text-slate-900">Service Metrics</h4>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Avg. Response Time', value: performance.averageResponseTimeMs != null ? `${(Number(performance.averageResponseTimeMs) / 1000).toFixed(0)}s` : '—', icon: Timer },
              { label: 'Accepted Leads', value: performance.acceptedLeads ?? 0, icon: ThumbsUp },
              { label: 'Declined / Ignored', value: `${performance.rejectedLeads ?? 0} / ${performance.ignoredLeads ?? 0}`, icon: ThumbsDown },
              { label: 'Completed Jobs', value: performance.completedJobs ?? 0, icon: Briefcase },
              { label: 'Cancelled Jobs', value: performance.cancelledJobs ?? 0, icon: TrendingUp }
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500 flex items-center gap-2">
                  <row.icon className="w-3.5 h-3.5 text-slate-400" /> {row.label}
                </span>
                <span className="font-black text-slate-900">{row.value}</span>
              </div>
            ))}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500 flex items-center gap-2">
                  <IndianRupee className="w-3.5 h-3.5 text-slate-400" /> Total Earnings
                </span>
                <span className="font-black text-emerald-700">{fmtMoney(performance.totalEarnings)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500 flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-slate-400" /> Platform Commission
                </span>
                <span className="font-black text-slate-900">{fmtMoney(performance.totalCommission)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Service Fee
                </span>
                <span className="font-black text-slate-900">{fmtMoney(provider?.serviceFee)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-extrabold text-slate-900">Level Journey</h4>
          </div>
          {history.length === 0 ? (
            <p className="text-slate-400 text-xs italic p-4 text-center">No level changes recorded yet.</p>
          ) : (
            <ol className="relative border-l border-slate-200 ml-2 space-y-4">
              {[...history].reverse().map((h, i) => (
                <li key={h.id} className="ml-4 relative">
                  <span className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-teal-500 ring-4 ring-teal-100" />
                  <p className="text-xs font-black text-slate-900 uppercase">{h.level}{h.previousLevel ? ` (from ${h.previousLevel})` : ''}</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{h.reason === 'INITIAL' ? 'Initial level' : h.reason} · {fmtDate(h.changedAt)} · {h.completedJobs} jobs</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" /> Promotions History ({promotions.length})
          </span>
        </div>
        {promotions.length === 0 ? (
          <p className="text-slate-400 text-xs italic p-6 text-center">Complete enough jobs and you will be promoted automatically.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['From', 'To', 'Completed Jobs', 'Promoted', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promotions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">{p.fromLevel}</td>
                    <td className="px-4 py-3 font-black text-slate-900">{p.toLevel}</td>
                    <td className="px-4 py-3 text-slate-600">{p.completedJobsAtPromotion}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(p.promotedAt)}</td>
                    <td className="px-4 py-3">
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
  );
}
