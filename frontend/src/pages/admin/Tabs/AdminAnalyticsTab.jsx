import React from 'react';
import { useData } from '../../../context/AppContext';

export default function AdminAnalyticsTab() {
  const { bookings, providers, services } = useData();

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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Platform Analytics</h2>
        <p className="text-slate-500 text-xs">
          Booking, service and provider insights. Platform totals (revenue, bookings, approvals, tickets) live on the Dashboard tab.
        </p>
      </div>

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
