import React from 'react';
import { Activity, Landmark, Users, MessageSquare, DollarSign, UserCheck } from 'lucide-react';


export default function AdminDashboardPanel({
  platformCommission,
  totalVolume,
  administrativeEarnings,
  pendingPartnersCount,
  activeTicketsCount,
  bookings,
  providers,
  handlePartnerApproval,
  setActiveTab,
  activeTab,
}) {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">System Administrator Console</h2>
          <p className="text-slate-500 text-xs">Real-time status monitoring, escrow checks, and service dispatch operations.</p>
        </div>
        <div className="bg-emerald-50 text-emerald-800 text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-full border border-emerald-250 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse block" />
          <span>Central Core Active</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-wider mb-1">Gross Escrow Vol.</span>
            <span className="text-lg sm:text-2xl font-black text-slate-950 block">₹{totalVolume}</span>
            <span className="text-[10px] text-teal-600 font-bold block mt-1">Platform comm{platformCommission}%</span>
          </div>
          <div className="p-3 bg-teal-50 text-teal-700 rounded-xl shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-wider mb-1">Admin Net Payout</span>
            <span className="text-lg sm:text-2xl font-black text-teal-700 block">₹{administrativeEarnings}</span>
            <span className="text-[10px] text-slate-400 block mt-1">Accumulated commission settings</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-wider mb-1">Vetting Backlog</span>
            <span className="text-lg sm:text-2xl font-black text-amber-600 block">{pendingPartnersCount} applicants</span>
            <span className="text-[10px] text-slate-400 block mt-1">Direct partner registration queue</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-wider mb-1">Dispute Tickets</span>
            <span className="text-lg sm:text-2xl font-black text-rose-600 block">{activeTicketsCount} open</span>
            <span className="text-[10px] text-slate-400 block mt-1">Customer & Partner complaints</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-700" />
              <span>Recent dispatch book ledger</span>
            </h3>
            <button
              onClick={() => setActiveTab('bookings')}
              className="text-teal-700 font-extrabold text-xs hover:underline uppercase tracking-wide"
            >
              View all ({bookings.length})
            </button>
          </div>

          <div className="space-y-3.5">
            {bookings.slice(0, 4).map((bk) => (
              <div
                key={bk.id}
                className="p-3.5 rounded-xl border border-slate-150 hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-semibold"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">{bk.id}</span>
                    <span className="text-slate-850 font-extrabold text-sm">{bk.serviceCategory}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    To Resident: <span className="text-slate-700 font-bold">{bk.customerName}</span> • Specialist:{' '}
                    <span className="text-slate-700 font-bold">{bk.providerName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                  <div className="font-mono text-slate-500 text-[10px]">
                    {bk.createdAt ? new Date(bk.createdAt).toLocaleDateString() : ''}
                  </div>
                  <div>
                    {['pending', 'new'].includes(bk.status) && (
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">Pending</span>
                    )}
                    {['confirmed', 'accepted'].includes(bk.status) && (
                      <span className="bg-indigo-100 text-indigo-850 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">Confirmed</span>
                    )}
                    {['ongoing', 'in_progress', 'en_route'].includes(bk.status) && (
                      <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">Ongoing</span>
                    )}
                    {['completed', 'reviewed'].includes(bk.status) && (
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">Completed</span>
                    )}
                    {['cancelled', 'canceled', 'rejected'].includes(bk.status) && (
                      <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">Cancelled</span>
                    )}
                  </div>
                  <span className="text-slate-900 font-black">₹{bk.totalAmount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-600" />
              <span>Awaiting Vetting Audit</span>
            </h3>
            <button onClick={() => setActiveTab('providerServiceRequests')} className="text-teal-700 font-extrabold text-xs hover:underline uppercase tracking-wide">
              Queue
            </button>
          </div>

          {pendingPartnersCount === 0 ? (
            <p className="text-slate-400 italic text-center py-10 text-xs font-semibold">No pending service requests.</p>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <span className="text-3xl font-black text-amber-600">{pendingPartnersCount}</span>
              <span className="text-xs text-slate-500 font-semibold">pending service approval{pendingPartnersCount !== 1 ? 's' : ''}</span>
              <button
                onClick={() => setActiveTab('providerServiceRequests')}
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

