import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, ShieldCheck, Percent, Clock, Users, CalendarDays } from 'lucide-react';
import { useApp } from '../context/AppContext';

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

function formatMoney(n) {
  const num = Number(n) || 0;
  return `₹${num.toLocaleString()}`;
}

function formatMs(ms) {
  const num = Number(ms) || 0;
  if (!num) return '—';
  if (num < 1000) return `${Math.round(num)} ms`;
  return `${(num / 1000).toFixed(1)} s`;
}

function monthSortKey(m) {
  // YYYY-MM
  const [y, mo] = String(m).split('-');
  return Number(y) * 100 + Number(mo);
}

export default function ProviderAnalyticsDashboard({ providerId }) {
  const { fetchProviderAnalytics } = useApp();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const data = await fetchProviderAnalytics(providerId, '90d');
      if (!cancelled) {
        setAnalytics(data);
        setLoading(false);
      }
    };
    if (providerId) run();
    else {
      setAnalytics(null);
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [providerId, fetchProviderAnalytics]);
  const [timeRange, setTimeRange] = useState('90d');

  const totals = analytics?.totals || {};

  const monthly = useMemo(() => (analytics?.monthlyEarnings || []), [analytics]);
  const trends = useMemo(() => (analytics?.bookingTrendsByMonth || []), [analytics]);

  const revenueSeries = useMemo(() => {
    if (!Array.isArray(monthly)) return [];
    return monthly.map((m) => ({ month: m.month, amount: m.earnings ?? 0 }));
  }, [monthly]);

  const revenueMax = useMemo(() => {
    const max = Math.max(1, ...revenueSeries.map((d) => Number(d.amount) || 0));
    return max;
  }, [revenueSeries]);

  const trendSeries = useMemo(() => {
    if (!Array.isArray(trends)) return [];
    return trends.slice().sort((a, b) => monthSortKey(a.month) - monthSortKey(b.month));
  }, [trends]);

  const acceptancePct = Math.round((totals.acceptanceRate || 0) * 100);
  const cancellationPct = Math.round((totals.cancellationRate || 0) * 100);
  const completionPct = Math.round((totals.completionRate || 0) * 100);
  const retentionPct = Math.round((totals.retentionRate || 0) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Provider Analytics Dashboard</h3>
          <p className="text-xs text-slate-500 font-semibold mt-1">Operational performance metrics beyond reputation.</p>
        </div>
        <div className="flex gap-2 bg-slate-50 border border-slate-200 p-1 rounded-2xl">
          {[
            { id: '7d', label: '7D' },
            { id: '30d', label: '30D' },
            { id: '90d', label: '90D' },
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

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 text-xs text-slate-500 font-semibold">Loading analytics…</div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Total earnings"
          value={formatMoney(totals.totalEarnings)}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6">
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

        <div className="bg-white border border-slate-200 rounded-3xl p-6">
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
                  trendSeries
                    .slice()
                    .sort((a, b) => monthSortKey(a.month) - monthSortKey(b.month))
                    .map((r) => (
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

      <div className="text-xs text-slate-500 italic font-semibold">
        Note: Earnings reflect provider payouts (service amount minus the admin-configured provider platform charge) on completed bookings.
      </div>
    </div>
  );
}

