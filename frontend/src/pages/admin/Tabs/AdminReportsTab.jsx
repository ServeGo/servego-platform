import { useEffect, useState, useCallback } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { api as apiClient } from '../../../utils/apiClient';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const fmtValue = (v) => {
  if (!v || typeof v !== 'object') return v || '—';
  return Object.entries(v).map(([k, val]) => `${k}: ${val}`).join(', ');
};

const ACTION_LABELS = {
  SET_PROVIDER_STATUS_ACTIVE: 'Activated',
  SET_PROVIDER_STATUS_BLOCKED: 'Blocked',
  SET_PROVIDER_STATUS_ON_HOLD: 'On Hold',
  SET_PROVIDER_STATUS_INACTIVE: 'Deactivated',
  APPROVE_SERVICE_REQUEST: 'Service Approved',
  DENY_SERVICE_REQUEST: 'Service Denied',
  VERIFY_PROVIDER: 'Verified',
  UNVERIFY_PROVIDER: 'Unverified',
};

const actionColor = (action) => {
  if (action?.includes('APPROVE') || action?.includes('ACTIVE') || action?.includes('VERIFY')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (action?.includes('DENY') || action?.includes('BLOCK') || action?.includes('UNVERIFY')) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (action?.includes('HOLD') || action?.includes('INACTIVE')) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

export default function AdminReportsTab() {
  const [tab, setTab] = useState('bookings');
  const PAGE_SIZE = 15;

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [bookingsTotalPages, setBookingsTotalPages] = useState(0);

  const [providers, setProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersPage, setProvidersPage] = useState(1);
  const [providersTotal, setProvidersTotal] = useState(0);
  const [providersTotalPages, setProvidersTotalPages] = useState(0);

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditTotalPages, setAuditTotalPages] = useState(0);

  const fetchBookings = useCallback(async (page) => {
    setBookingsLoading(true);
    try {
      const res = await apiClient.get(`/admin/bookings?page=${page}&limit=${PAGE_SIZE}`);
      if (res.ok) {
        setBookings(res.data?.bookings || []);
        setBookingsTotal(res.data?.pagination?.total || 0);
        setBookingsTotalPages(res.data?.pagination?.pages || 0);
      } else {
        setBookings([]);
      }
    } catch {
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  const fetchProviders = useCallback(async (page) => {
    setProvidersLoading(true);
    try {
      const res = await apiClient.get(`/admin/providers?page=${page}&limit=${PAGE_SIZE}`);
      if (res.ok) {
        setProviders(res.data?.providers || []);
        setProvidersTotal(res.data?.pagination?.total || 0);
        setProvidersTotalPages(res.data?.pagination?.totalPages || 0);
      } else {
        setProviders([]);
      }
    } catch {
      setProviders([]);
    } finally {
      setProvidersLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async (page) => {
    setAuditLoading(true);
    try {
      const res = await apiClient.get(`/admin/audit-logs?page=${page}&limit=${PAGE_SIZE}`);
      if (res.ok) {
        setAuditLogs(res.data?.logs || []);
        setAuditTotal(res.data?.pagination?.total || 0);
        setAuditTotalPages(res.data?.pagination?.totalPages || 0);
      } else {
        setAuditLogs([]);
      }
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'bookings') fetchBookings(bookingsPage);
    else if (tab === 'providers') fetchProviders(providersPage);
    else if (tab === 'audit') fetchAuditLogs(auditPage);
  }, [tab, bookingsPage, providersPage, auditPage, fetchBookings, fetchProviders, fetchAuditLogs]);

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

      <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-2xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setBookingsPage(1); setProvidersPage(1); setAuditPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'bookings' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-extrabold text-slate-900">All Bookings ({bookingsTotal})</span>
            {bookingsLoading && <span className="text-[10px] text-slate-400 font-semibold">Loading...</span>}
          </div>
          {bookingsLoading ? (
            <p className="text-slate-400 text-xs italic p-6">Loading bookings...</p>
          ) : bookings.length === 0 ? (
            <p className="text-slate-400 text-xs italic p-6 text-center">No bookings found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Booking ID', 'Customer', 'Provider', 'Service', 'Date', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-slate-700">{b.id}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{b.customerName || b.customer?.name || '—'}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{b.providerName || b.provider?.user?.name || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{b.serviceCategory || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{fmt(b.createdAt || b.bookingDate)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            b.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            b.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            b.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-sky-50 text-sky-700 border-sky-200'
                          }`}>{b.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {bookingsTotalPages > 1 && (
                <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Page {bookingsPage} of {bookingsTotalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      disabled={bookingsPage <= 1}
                      onClick={() => setBookingsPage(p => p - 1)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={bookingsPage >= bookingsTotalPages}
                      onClick={() => setBookingsPage(p => p + 1)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'providers' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-extrabold text-slate-900">All Providers ({providersTotal})</span>
            {providersLoading && <span className="text-[10px] text-slate-400 font-semibold">Loading...</span>}
          </div>
          {providersLoading ? (
            <p className="text-slate-400 text-xs italic p-6">Loading providers...</p>
          ) : providers.length === 0 ? (
            <p className="text-slate-400 text-xs italic p-6 text-center">No providers found.</p>
          ) : (
            <>
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
                        <td className="px-4 py-3 font-semibold text-slate-800">{p.user?.name || '—'}</td>
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
              </div>

              {providersTotalPages > 1 && (
                <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Page {providersPage} of {providersTotalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      disabled={providersPage <= 1}
                      onClick={() => setProvidersPage(p => p - 1)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={providersPage >= providersTotalPages}
                      onClick={() => setProvidersPage(p => p + 1)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-extrabold text-slate-900">Audit Log</span>
            <span className="text-[10px] text-slate-400 font-semibold">{auditTotal} total entries</span>
          </div>
          {auditLoading ? (
            <p className="text-slate-400 text-xs italic p-6">Loading audit logs...</p>
          ) : auditLogs.length === 0 ? (
            <p className="text-slate-400 text-xs italic p-6 text-center">No audit log entries yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Actor', 'Action', 'Provider / Customer', 'Old Value', 'New Value', 'Date'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800 capitalize">{log.actorRole || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${actionColor(log.action)}`}>
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{log.targetName || '—'}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={fmtValue(log.oldValue)}>{fmtValue(log.oldValue)}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={fmtValue(log.newValue)}>{fmtValue(log.newValue)}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmt(log.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {auditTotalPages > 1 && (
                <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Page {auditPage} of {auditTotalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      disabled={auditPage <= 1}
                      onClick={() => setAuditPage(p => p - 1)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={auditPage >= auditTotalPages}
                      onClick={() => setAuditPage(p => p + 1)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
