import React from 'react';
import {
  Activity,
  CalendarCheck,
  Users,
  MessageSquare,
  Landmark,
  UserCheck,
  ArrowRight,
} from 'lucide-react';

const fmtINR = (n) => {
  const v = Number(n) || 0;
  return `₹${v.toLocaleString('en-IN')}`;
};

const fmtDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const statusInfo = (raw) => {
  const s = (raw || '').toString().trim().toUpperCase();
  if (['PENDING', 'NEW'].includes(s)) return { label: 'Pending', className: 'bg-amber-100 text-amber-800' };
  if (['CONFIRMED', 'ACCEPTED'].includes(s)) return { label: 'Confirmed', className: 'bg-indigo-100 text-indigo-800' };
  if (['ONGOING', 'IN_PROGRESS', 'EN_ROUTE'].includes(s)) return { label: 'Ongoing', className: 'bg-purple-100 text-purple-800' };
  if (['COMPLETED', 'REVIEWED'].includes(s)) return { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' };
  if (['CANCELLED', 'CANCELED', 'REJECTED'].includes(s)) return { label: 'Cancelled', className: 'bg-rose-100 text-rose-800' };
  return { label: s || '—', className: 'bg-slate-100 text-slate-700' };
};

const cards = [
  {
    key: 'volume',
    label: 'Total Volume',
    value: fmtINR(0),
    valueClass: 'text-slate-950',
    icon: Landmark,
    iconClass: 'bg-teal-50 text-teal-700',
    render: (p) => fmtINR(p.totalVolume),
  },
  {
    key: 'bookings',
    label: 'Total Bookings',
    icon: CalendarCheck,
    iconClass: 'bg-emerald-50 text-emerald-700',
    valueClass: 'text-slate-950',
    render: (p) => p.bookings.length,
  },
  {
    key: 'pending',
    label: 'Pending Approvals',
    icon: Users,
    iconClass: 'bg-amber-50 text-amber-600',
    valueClass: 'text-amber-600',
    render: (p) => p.pendingPartnersCount,
  },
  {
    key: 'tickets',
    label: 'Open Tickets',
    icon: MessageSquare,
    iconClass: 'bg-rose-50 text-rose-600',
    valueClass: 'text-rose-600',
    render: (p) => p.activeTicketsCount,
  },
];

export default function AdminDashboardPanel({
  totalVolume,
  pendingPartnersCount,
  activeTicketsCount,
  bookings,
  setActiveTab,
}) {
  const props = { totalVolume, pendingPartnersCount, activeTicketsCount, bookings: Array.isArray(bookings) ? bookings : [] };
  const recent = props.bookings.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h2>
        <p className="text-slate-500 text-xs">Live platform overview and recent booking activity.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-wider mb-1">{card.label}</span>
                <span className={`text-xl sm:text-2xl font-black block break-all ${card.valueClass}`}>{card.render(props)}</span>
              </div>
              <div className={`p-3 rounded-xl shrink-0 ${card.iconClass}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-700" />
              <span>Recent Bookings</span>
            </h3>
            <button
              onClick={() => setActiveTab?.('bookings')}
              className="text-teal-700 font-extrabold text-xs hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recent.length === 0 ? (
            <p className="text-slate-400 italic text-center py-10 text-xs font-semibold">No bookings yet.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((bk) => {
                const st = statusInfo(bk.status);
                return (
                  <div
                    key={bk.id}
                    className="p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50/60 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-semibold"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded truncate">{bk.id}</span>
                        <span className="text-slate-900 font-extrabold text-sm truncate">{bk.serviceCategory}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium truncate">
                        {bk.customerName || 'Customer'} <span className="text-slate-400">→</span> {bk.providerName || 'Provider'}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                      <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">{fmtDate(bk.createdAt)}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${st.className}`}>{st.label}</span>
                      <span className="text-slate-900 font-black whitespace-nowrap">{fmtINR(bk.totalAmount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-600" />
              <span>Pending Approvals</span>
            </h3>
            <button onClick={() => setActiveTab?.('providerServiceRequests')} className="text-teal-700 font-extrabold text-xs hover:underline">
              Queue
            </button>
          </div>

          {pendingPartnersCount === 0 ? (
            <p className="text-slate-400 italic text-center py-10 text-xs font-semibold">All caught up — nothing pending.</p>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <span className="text-3xl font-black text-amber-600">{pendingPartnersCount}</span>
              <span className="text-xs text-slate-500 font-semibold">request{pendingPartnersCount !== 1 ? 's' : ''} awaiting review</span>
              <button
                onClick={() => setActiveTab?.('providerServiceRequests')}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
              >
                Review Requests
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
