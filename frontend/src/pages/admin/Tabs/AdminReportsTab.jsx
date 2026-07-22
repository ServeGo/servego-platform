import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function AdminReportsTab() {
  const { bookings, providers } = useApp();
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [tab, setTab] = useState('bookings'); // bookings | providers | audit

  useEffect(() => {
    // Audit events are not exposed by this backend yet. Keep the report tab
    // usable rather than leaving it in a permanent loading state.
    setAuditLogs([]);
    setAuditLoading(false);
  }, []);

  const tabs = [
    { id: 'bookings', label: 'Bookings Report' },
    { id: 'providers', label: 'Providers Report' },
    { id: 'audit', label: 'Audit Log' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Reports</h2>
        <p className="text-slate-500 text-xs">Operational data, audit trail, and exportable summaries.</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-2xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'bookings' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-extrabold text-slate-900">All Bookings ({bookings.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Booking ID', 'Customer', 'Provider', 'Service', 'Date', 'Status', 'Payment'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-700">{b.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{b.customerName || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{b.providerName || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{b.serviceCategory || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{fmt(b.bookingDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        b.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        b.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        b.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-sky-50 text-sky-700 border-sky-200'
                      }`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">{b.paymentStatus || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bookings.length === 0 && (
              <p className="text-center text-slate-400 text-xs italic py-8">No bookings found.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'providers' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <span className="text-sm font-extrabold text-slate-900">All Providers ({providers.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Name', 'Category', 'Rating', 'Jobs Done', 'Verified', 'Joined'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {providers.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.category || '—'}</td>
                    <td className="px-4 py-3 text-amber-600 font-bold flex items-center gap-1"><Star className="w-3.5 h-3.5" /> {p.rating || 0}</td>
                    <td className="px-4 py-3 text-slate-700 font-semibold">{p.jobsCompleted || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${p.isVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {p.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{fmt(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {providers.length === 0 && (
              <p className="text-center text-slate-400 text-xs italic py-8">No providers found.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <span className="text-sm font-extrabold text-slate-900">Audit Log</span>
          </div>
          {auditLoading ? (
            <p className="text-slate-400 text-xs italic p-6">Loading audit logs...</p>
          ) : auditLogs.length === 0 ? (
            <p className="text-slate-400 text-xs italic p-6 text-center">No audit log entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Actor', 'Role', 'Action', 'Target', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-slate-600 text-[10px]">{log.actorId?.slice(-6)}</td>
                      <td className="px-4 py-3 capitalize text-slate-700 font-semibold">{log.actorRole}</td>
                      <td className="px-4 py-3 font-bold text-indigo-700">{log.action}</td>
                      <td className="px-4 py-3 text-slate-600">{log.targetType} <span className="font-mono text-[10px]">{log.targetId?.slice(-6)}</span></td>
                      <td className="px-4 py-3 text-slate-500">{fmt(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
