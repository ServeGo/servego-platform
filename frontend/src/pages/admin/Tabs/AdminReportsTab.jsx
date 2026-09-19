import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  CalendarCheck,
  Users,
  ScrollText,
  Inbox
} from 'lucide-react';
import { api as apiClient } from '../../../utils/apiClient';
import { exportAllPages } from '../../../utils/exportExcel';
import { SkeletonLoader } from '../../../components/SkeletonLoader';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const BOOKING_EXPORT_COLUMNS = [
  { header: 'Booking Number', key: 'bookingNumber' },
  { header: 'Customer', key: 'customerName' },
  { header: 'Provider', key: 'providerName' },
  { header: 'Service Category', key: 'serviceCategory' },
  { header: 'Status', key: 'status' },
  { header: 'Created At', key: 'createdAtLabel' }
];

const PROVIDER_EXPORT_COLUMNS = [
  { header: 'Name', key: 'name' },
  { header: 'Category', key: 'category' },
  { header: 'Rating', key: 'rating' },
  { header: 'Jobs Completed', key: 'jobsCompleted' },
  { header: 'Verified', key: 'verifiedLabel' },
  { header: 'Joined', key: 'joinedLabel' }
];

const AUDIT_EXPORT_COLUMNS = [
  { header: 'Actor Role', key: 'actorRole' },
  { header: 'Actor Name', key: 'actorName' },
  { header: 'Action', key: 'action' },
  { header: 'Target', key: 'targetName' },
  { header: 'Old Value', key: 'oldValue' },
  { header: 'New Value', key: 'newValue' },
  { header: 'Date', key: 'dateLabel' }
];

const ACTION_LABELS = {
  SET_PROVIDER_STATUS_ACTIVE: 'Activated',
  SET_PROVIDER_STATUS_BLOCKED: 'Blocked',
  SET_PROVIDER_STATUS_ON_HOLD: 'On Hold',
  SET_PROVIDER_STATUS_INACTIVE: 'Deactivated',
  APPROVE_SERVICE_REQUEST: 'Service Approved',
  DENY_SERVICE_REQUEST: 'Service Denied',
  VERIFY_PROVIDER: 'Verified',
  UNVERIFY_PROVIDER: 'Unverified',
  CANCEL_BOOKING_OVERRIDE: 'Booking Override Cancelled',
  PROCESS_WITHDRAWAL_APPROVED: 'Withdrawal Approved',
  PROCESS_WITHDRAWAL_REJECTED: 'Withdrawal Rejected',
  PROCESS_WITHDRAWAL_PAID: 'Payout Marked Paid',
  WALLET_CREDIT: 'Wallet Credit',
  APPROVE_PERMANENT_REQUEST: 'Permanent Request Approved',
  REJECT_PERMANENT_REQUEST: 'Permanent Request Rejected',
  UPDATE_CONFIG: 'Config Updated',
  UPDATE_CONFIG_CANCELLATION_PENALTY_SCORE: 'Penalty Score Config',
  UPDATE_LEVEL_RULE: 'Level Rule Updated'
};

const actionLabel = (action) => {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  if (action?.startsWith('UPDATE_CONFIG_')) return 'Config Updated';
  return action || '';
};

const fmtValue = (v) => {
  if (!v || typeof v !== 'object') return v || '—';
  return Object.entries(v).map(([k, val]) => `${k}: ${val}`).join(', ');
};

const actionColor = (action) => {
  if (action?.includes('APPROVE') || action?.includes('ACTIVE') || action?.includes('VERIFY')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (action?.includes('DENY') || action?.includes('BLOCK') || action?.includes('UNVERIFY')) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (action?.includes('HOLD') || action?.includes('INACTIVE')) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

const bookingStatusBadge = (status) => {
  if (status === 'COMPLETED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'CANCELLED') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-sky-50 text-sky-700 border-sky-200';
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
  const [exporting, setExporting] = useState('');

  const fetchAllBookings = useCallback(async (page, limit) => {
    const res = await apiClient.get(`/admin/bookings?page=${page}&limit=${limit}`);
    if (!res.ok) return { rows: [], total: 0 };
    const rows = (res.data?.bookings || []).map((b) => ({
      bookingNumber: b.bookingNumber || '',
      customerName: b.customerName || b.customer?.name || '',
      providerName: b.providerName || b.provider?.user?.name || '',
      serviceCategory: b.serviceCategory || '',
      status: b.status || '',
      createdAtLabel: fmt(b.createdAt || b.bookingDate)
    }));
    return { rows, total: res.data?.pagination?.total || 0 };
  }, []);

  const fetchAllProviders = useCallback(async (page, limit) => {
    const res = await apiClient.get(`/admin/providers?page=${page}&limit=${limit}`);
    if (!res.ok) return { rows: [], total: 0 };
    const rows = (res.data?.providers || []).map((p) => ({
      name: p.user?.name || '',
      category: p.category || '',
      rating: p.rating || 0,
      jobsCompleted: p.jobsCompleted || 0,
      verifiedLabel: p.isVerified ? 'Verified' : 'Pending',
      joinedLabel: fmt(p.createdAt)
    }));
    return { rows, total: res.data?.pagination?.total || 0 };
  }, []);

  const fetchAllAuditLogs = useCallback(async (page, limit) => {
    const res = await apiClient.get(`/admin/audit-logs?page=${page}&limit=${limit}`);
    if (!res.ok) return { rows: [], total: 0 };
    const rows = (res.data?.logs || []).map((log) => ({
      actorRole: log.actorRole || '',
      actorName: log.actorName || '',
      action: actionLabel(log.action),
      targetName: log.targetName || '',
      oldValue: fmtValue(log.oldValue),
      newValue: fmtValue(log.newValue),
      dateLabel: fmt(log.createdAt)
    }));
    return { rows, total: res.data?.pagination?.total || 0 };
  }, []);

  const handleExport = async (kind) => {
    setExporting(kind);
    try {
      if (kind === 'bookings') {
        await exportAllPages({ fetchPage: fetchAllBookings, fileName: 'bookings-report', sheetName: 'Bookings', columns: BOOKING_EXPORT_COLUMNS });
      } else if (kind === 'providers') {
        await exportAllPages({ fetchPage: fetchAllProviders, fileName: 'providers-report', sheetName: 'Providers', columns: PROVIDER_EXPORT_COLUMNS });
      } else {
        await exportAllPages({ fetchPage: fetchAllAuditLogs, fileName: 'audit-log', sheetName: 'Audit Log', columns: AUDIT_EXPORT_COLUMNS });
      }
    } catch (err) {
      console.error('Excel export failed:', err);
    } finally {
      setExporting('');
    }
  };

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

  // Guard on the args so React StrictMode's dev double-mount does not fire the
  // same request twice, while a real tab/page change (different key) still
  // re-fetches.
  const lastFetchKeyRef = useRef('');
  useEffect(() => {
    const key = `${tab}|${bookingsPage}|${providersPage}|${auditPage}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;
    if (tab === 'bookings') fetchBookings(bookingsPage);
    else if (tab === 'providers') fetchProviders(providersPage);
    else if (tab === 'audit') fetchAuditLogs(auditPage);
  }, [tab, bookingsPage, providersPage, auditPage, fetchBookings, fetchProviders, fetchAuditLogs]);

  const switchTab = (id) => {
    setTab(id);
    setBookingsPage(1);
    setProvidersPage(1);
    setAuditPage(1);
  };

  const tabs = [
    { id: 'bookings', label: 'Bookings', count: bookingsTotal, icon: CalendarCheck },
    { id: 'providers', label: 'Providers', count: providersTotal, icon: Users },
    { id: 'audit', label: 'Audit Log', count: auditTotal, icon: ScrollText }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Reports</h2>
        <p className="text-slate-500 text-xs mt-0.5">Operational data, audit trail, and exportable summaries.</p>
      </div>

      <div className="inline-flex flex-wrap items-center gap-1 bg-slate-100 rounded-xl p-1 self-start">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
              tab === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            <span className={`min-w-5 h-4 px-1.5 inline-flex items-center justify-center rounded-full text-[9px] font-black tabular-nums ${
              tab === t.id ? 'bg-slate-100 text-slate-500' : 'bg-white/80 text-slate-400'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === 'bookings' && (
        <>
          <SectionShell
            title={`All Bookings (${bookingsTotal})`}
            icon={CalendarCheck}
            loading={bookingsLoading}
            exporting={exporting === 'bookings'}
            canExport={bookingsTotal > 0}
            onExport={() => handleExport('bookings')}
          >
            {bookingsLoading ? (
              <DualSkeleton />
            ) : bookings.length === 0 ? (
              <EmptyState title="No bookings found" message="Nothing to report yet for this page." />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[720px] text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {['Booking Number', 'Customer', 'Provider', 'Service', 'Date', 'Status'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bookings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-slate-700">{b.bookingNumber || '—'}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{b.customerName || b.customer?.name || '—'}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{b.providerName || b.provider?.user?.name || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{b.serviceCategory || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{fmt(b.createdAt || b.bookingDate)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${bookingStatusBadge(b.status)}`}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="md:hidden p-4 space-y-3">
                  {bookings.map((b) => (
                    <MobileCard key={b.id}>
                      <div className="flex items-start justify-between gap-3 p-4 pb-3 border-b border-slate-100">
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-slate-900 truncate">
                            {b.customerName || b.customer?.name || 'Customer'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold font-mono truncate">{b.bookingNumber || '—'}</div>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${bookingStatusBadge(b.status)}`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="p-4 space-y-3">
                        <InfoRow label="Provider" value={b.providerName || b.provider?.user?.name || '—'} />
                        <InfoRow label="Service" value={b.serviceCategory || '—'} />
                        <InfoRow label="Date" value={fmt(b.createdAt || b.bookingDate)} />
                      </div>
                    </MobileCard>
                  ))}
                </div>
              </>
            )}
          </SectionShell>
          {bookingsTotalPages > 1 && (
            <Paginator page={bookingsPage} totalPages={bookingsTotalPages} onChange={setBookingsPage} />
          )}
        </>
      )}

      {tab === 'providers' && (
        <>
          <SectionShell
            title={`All Providers (${providersTotal})`}
            icon={Users}
            loading={providersLoading}
            exporting={exporting === 'providers'}
            canExport={providersTotal > 0}
            onExport={() => handleExport('providers')}
          >
            {providersLoading ? (
              <DualSkeleton />
            ) : providers.length === 0 ? (
              <EmptyState title="No providers found" message="Nothing to report yet for this page." />
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[720px] text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {['Name', 'Category', 'Rating', 'Jobs Done', 'Verified', 'Joined'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {providers.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{p.user?.name || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{p.category || '—'}</td>
                          <td className="px-4 py-3 text-amber-600 font-bold">
                            <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" /> {p.rating || 0}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-semibold">{p.jobsCompleted || 0}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              p.isVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {p.isVerified ? 'Verified' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{fmt(p.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden p-4 space-y-3">
                  {providers.map((p) => {
                    const name = p.user?.name || 'Provider';
                    return (
                      <MobileCard key={p.id}>
                        <div className="flex items-start justify-between gap-3 p-4 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-sky-100 to-violet-100 text-slate-700 flex items-center justify-center text-sm font-black">
                              {name.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-extrabold text-slate-900 truncate max-w-[160px]">{name}</div>
                              <div className="text-[10px] text-slate-400 font-semibold truncate">{p.category || 'No category'}</div>
                            </div>
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            p.isVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {p.isVerified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <InfoRow label="Rating" value={`${p.rating || 0} / 5`} accent="text-amber-600" />
                            <InfoRow label="Jobs done" value={p.jobsCompleted || 0} />
                          </div>
                          <InfoRow label="Joined" value={fmt(p.createdAt)} />
                        </div>
                      </MobileCard>
                    );
                  })}
                </div>
              </>
            )}
          </SectionShell>
          {providersTotalPages > 1 && (
            <Paginator page={providersPage} totalPages={providersTotalPages} onChange={setProvidersPage} />
          )}
        </>
      )}

      {tab === 'audit' && (
        <>
          <SectionShell
            title={`Audit Log (${auditTotal})`}
            icon={ScrollText}
            loading={auditLoading}
            exporting={exporting === 'audit'}
            canExport={auditTotal > 0}
            onExport={() => handleExport('audit')}
          >
            {auditLoading ? (
              <DualSkeleton />
            ) : auditLogs.length === 0 ? (
              <EmptyState title="No audit entries" message="Admin actions will be recorded here." />
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[900px] text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {['Actor', 'Action', 'Provider / Customer', 'Old Value', 'New Value', 'Date'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-800 capitalize">{log.actorRole || '—'}</span>
                            {log.actorName && <span className="text-[10px] text-slate-400 block font-semibold">{log.actorName}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${actionColor(log.action)}`}>
                              {actionLabel(log.action)}
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

                <div className="md:hidden p-4 space-y-3">
                  {auditLogs.map((log) => (
                    <MobileCard key={log.id}>
                      <div className="flex items-start justify-between gap-3 p-4 pb-3 border-b border-slate-100">
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-slate-900 capitalize truncate">{log.actorRole || 'Audit'}</div>
                          {log.actorName && <div className="text-[10px] text-slate-400 font-semibold truncate">{log.actorName}</div>}
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${actionColor(log.action)}`}>
                          {actionLabel(log.action)}
                        </span>
                      </div>
                      <div className="p-4 space-y-3">
                        <InfoRow label="Target" value={log.targetName || '—'} />
                        <InfoRow label="Old value" value={fmtValue(log.oldValue)} />
                        <InfoRow label="New value" value={fmtValue(log.newValue)} />
                        <InfoRow label="Date" value={fmt(log.createdAt)} />
                      </div>
                    </MobileCard>
                  ))}
                </div>
              </>
            )}
          </SectionShell>
          {auditTotalPages > 1 && (
            <Paginator page={auditPage} totalPages={auditTotalPages} onChange={setAuditPage} />
          )}
        </>
      )}
    </div>
  );
}

function SectionShell({ title, icon: Icon, loading, exporting, canExport, onExport, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-slate-50 text-slate-500"><Icon className="w-4 h-4" /></span>
          {title}
        </span>
        <div className="flex w-full sm:w-auto flex-wrap items-center justify-end gap-2">
          {loading && <span className="text-[10px] text-slate-400 font-semibold">Loading...</span>}
          <button
            onClick={onExport}
            disabled={exporting || !canExport}
            className="flex shrink-0 items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

function DualSkeleton() {
  return (
    <>
      <div className="md:hidden space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-200 rounded w-1/3" />
              </div>
              <div className="h-5 w-16 bg-slate-200 rounded-full shrink-0" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 bg-slate-200 rounded w-full" />
              <div className="h-3 bg-slate-200 rounded w-5/6" />
              <div className="h-3 bg-slate-200 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden md:block"><SkeletonLoader type="table" count={3} /></div>
    </>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center py-14 px-6 -m-px">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
        <Inbox className="w-6 h-6" />
      </div>
      <p className="text-sm font-extrabold text-slate-700 mt-3">{title}</p>
      <p className="text-xs text-slate-400 font-medium mt-1 max-w-[260px] leading-relaxed">{message}</p>
    </div>
  );
}

function MobileCard({ children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs">
      {children}
    </div>
  );
}

function InfoRow({ label, value, accent = 'text-slate-700' }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 pt-0.5 shrink-0">{label}</p>
      <p className={`text-xs font-bold text-right break-words min-w-0 ${accent}`}>{value}</p>
    </div>
  );
}

function Paginator({ page, totalPages, onChange }) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-2xs">
      <span className="text-[11px] font-semibold text-slate-500">
        Page <span className="font-extrabold text-slate-700">{page}</span> of {totalPages}
      </span>
      <div className="flex items-center justify-end gap-1.5 w-full sm:w-auto">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>
        <span className="px-2 text-[11px] font-extrabold text-slate-700 tabular-nums">{page} / {totalPages}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}