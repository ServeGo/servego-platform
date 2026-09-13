import React, { useEffect, useState } from 'react';
import { useData } from '../../../context/AppContext';
import { api as apiClient } from '../../../utils/apiClient';

export default function AdminAnalyticsTab() {
  const { bookings, providers, services } = useData();
  const [period, setPeriod] = useState('30d');
  const [serverAnalytics, setServerAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Booking status breakdown from AppContext
  const statusCounts = ['pending', 'confirmed', 'ongoing', 'completed', 'cancelled'].map(s => ({
    label: s.charAt(0).toUpperCase() + s.slice(1),
    count: bookings.filter(b => b.status === s).length,
    color: { pending: 'bg-amber-400', confirmed: 'bg-sky-400', ongoing: 'bg-purple-400', completed: 'bg-emerald-400', cancelled: 'bg-rose-400' }[s]
  }));

  // Service booking distribution
  const serviceCounts = services.map(svc => ({
    name: svc.name,
    count: bookings.filter(b => (b.serviceCategory || '').toLowerCase() === svc.name.toLowerCase()).length
  })).filter(s => s.count > 0).sort((a, b) => b.count - a.count);

  const totalBookings = bookings.length || 1;

  useEffect(() => {
    let active = true;
    setAnalyticsLoading(true);
    apiClient.get(`/admin/analytics?period=${period}`).then((res) => {
      if (!active) return;
      setServerAnalytics(res.ok ? res.data : null);
      setAnalyticsLoading(false);
    }).catch(() => {
      if (active) {
        setServerAnalytics(null);
        setAnalyticsLoading(false);
      }
    });
    return () => { active = false; };
  }, [period]);

  const periodStatusCounts = serverAnalytics?.bookingsByStatus || [];
  const periodStatusTotal = periodStatusCounts.reduce((sum, row) => sum + (row._count || 0), 0) || 1;
  const ratingDistribution = serverAnalytics?.ratingDistribution || {};
  const ratingTotal = serverAnalytics?.totalReviewsThisPeriod || 0;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Platform Analytics</h2>
            <p className="text-slate-500 text-xs">Booking, service, provider, and rating insights for the selected period.</p>
          </div>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-teal-500">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {analyticsLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs font-semibold text-slate-400">Loading period analytics...</div>
      ) : serverAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          <AnalyticsPanel title="Bookings by Status">
            {periodStatusCounts.length === 0 ? <EmptyAnalytics /> : periodStatusCounts.map((row) => (
              <MetricRow key={row.status} label={row.status} value={row._count || 0} total={periodStatusTotal} />
            ))}
          </AnalyticsPanel>
          <AnalyticsPanel title="Top Services">
            {serverAnalytics.topServices?.length ? serverAnalytics.topServices.map((row) => (
              <MetricRow key={row.serviceCategory} label={row.serviceCategory || 'Uncategorised'} value={row._count || 0} total={periodStatusTotal} />
            )) : <EmptyAnalytics />}
          </AnalyticsPanel>
          <AnalyticsPanel title={`Ratings (${ratingTotal})`}>
            {[5, 4, 3, 2, 1].map((rating) => (
              <MetricRow key={rating} label={`${rating} star`} value={ratingDistribution[rating] || 0} total={ratingTotal || 1} color="bg-amber-400" />
            ))}
          </AnalyticsPanel>
          <AnalyticsPanel title="Top Providers">
            {serverAnalytics.topProviders?.length ? serverAnalytics.topProviders.map((row) => (
              <MetricRow key={row.providerId || 'unknown'} label={row.providerId || 'Unknown'} value={row._count || 0} total={serverAnalytics.topProviders[0]?._count || 1} color="bg-indigo-400" />
            )) : <EmptyAnalytics />}
          </AnalyticsPanel>
        </div>
      )}

      {/* Booking Status Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Booking Status Breakdown</h3>
        <div className="space-y-3">
          {statusCounts.map(s => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="w-24 text-xs font-bold text-slate-600 text-right shrink-0">{s.label}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full ${s.color} transition-all`}
                  style={{ width: `${Math.round((s.count / totalBookings) * 100)}%` }}
                />
              </div>
              <span className="w-8 text-xs font-black text-slate-800 shrink-0">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Service Demand */}
      {serviceCounts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Bookings by Service</h3>
          <div className="space-y-3">
            {serviceCounts.map(s => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="w-24 text-xs font-bold text-slate-600 text-right shrink-0 truncate">{s.name}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full bg-indigo-400 transition-all"
                    style={{ width: `${Math.round((s.count / totalBookings) * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-xs font-black text-slate-800 shrink-0">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provider Stats */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Provider Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <Stat label="Total Providers" value={providers.length} />
          <Stat label="Verified" value={providers.filter(p => p.isVerified).length} />
          <Stat label="Featured" value={providers.filter(p => p.isFeatured).length} />
          <Stat label="Avg Rating" value={providers.length ? (providers.reduce((s, p) => s + (p.rating || 0), 0) / providers.length).toFixed(1) : '—'} />
        </div>
      </div>
    </div>
  );
}

function AnalyticsPanel({ title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
      <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">{title}</h3>
      {children}
    </div>
  );
}

function MetricRow({ label, value, total, color = 'bg-teal-400' }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 truncate text-[10px] font-bold text-slate-600">{label}</span>
      <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, Math.round((value / total) * 100))}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-black text-slate-800">{value}</span>
    </div>
  );
}

function EmptyAnalytics() {
  return <p className="text-xs italic text-slate-400">No data for this period.</p>;
}

function Stat({ label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
      <span className="block text-xl font-black text-slate-900">{value}</span>
      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{label}</span>
    </div>
  );
}
