import React, { useEffect, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { api } from '../../../utils/apiClient';
import { Loader2 } from 'lucide-react';

export default function AdminAnalyticsTab() {
  const { bookings, providers, services } = useApp();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(response => { setMetrics(response.ok ? response.data : null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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

  const statCards = loading || !metrics ? [] : [
    { label: 'Total Providers', value: metrics.users?.providers ?? metrics.totalProviders ?? 0, color: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
    { label: 'Total Customers', value: metrics.users?.customers ?? metrics.totalCustomers ?? 0, color: 'text-teal-700 bg-teal-50 border-teal-100' },
    { label: 'Active Bookings', value: metrics.bookings?.active ?? metrics.activeBookings ?? 0, color: 'text-amber-700 bg-amber-50 border-amber-100' },
    { label: 'Completed This Month', value: metrics.bookings?.completedThisMonth ?? metrics.completedThisMonth ?? 0, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
    { label: 'Pending Approvals', value: metrics.services?.pendingApprovals ?? metrics.pendingApprovals ?? 0, color: 'text-rose-700 bg-rose-50 border-rose-100' },
    { label: 'Open Tickets', value: metrics.tickets?.open ?? metrics.openTickets ?? 0, color: 'text-slate-700 bg-slate-50 border-slate-200' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Platform Analytics</h2>
        <p className="text-slate-500 text-xs">Live metrics from the platform.</p>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-xs"><Loader2 className="w-4 h-4 animate-spin" /> Loading metrics...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map(c => (
            <div key={c.label} className={`rounded-2xl border p-4 text-center ${c.color}`}>
              <span className="block text-2xl font-black">{c.value ?? '—'}</span>
              <span className="block text-[10px] font-bold uppercase tracking-wide mt-1 opacity-70">{c.label}</span>
            </div>
          ))}
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

function Stat({ label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
      <span className="block text-xl font-black text-slate-900">{value}</span>
      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{label}</span>
    </div>
  );
}
