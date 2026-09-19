import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldCheck,
  Phone,
  Mail,
  RefreshCw,
  FileSpreadsheet,
  Inbox,
  Layers,
  X,
  Loader2,
  BadgeCheck,
  UserCheck,
  Wallet
} from 'lucide-react';
import { api } from '../../utils/apiClient';
import { exportAllPages } from '../../utils/exportExcel';
import { ReputationBadgeStrip, VerificationLevelPill } from '../ProviderReputation';

const PAGE_SIZE = 9;

const ACCOUNT_STATUS_BADGE = {
  ACTIVE: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  ON_HOLD: 'bg-amber-50 border-amber-200 text-amber-800',
  BLOCKED: 'bg-rose-50 border-rose-200 text-rose-800',
};

const fmt = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtMoney = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '₹0';
};

const asList = (v) => {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const joinList = (v) => asList(v).join(', ');

const PROVIDER_EXPORT_COLUMNS = [
  { header: 'Provider Number', key: 'providerNumber' },
  { header: 'Name', key: 'name' },
  { header: 'Email', key: 'email' },
  { header: 'Phone', key: 'phone' },
  { header: 'Category', key: 'category' },
  { header: 'Sector', key: 'sector' },
  { header: 'Rating', key: 'rating' },
  { header: 'Reviews', key: 'reviewCount' },
  { header: 'Jobs Completed', key: 'jobsCompleted' },
  { header: 'Level', key: 'providerLevel' },
  { header: 'Service Fee', key: 'serviceFeeLabel' },
  { header: 'Verification Level', key: 'verificationLevel' },
  { header: 'Verified', key: 'verifiedLabel' },
  { header: 'Featured', key: 'featuredLabel' },
  { header: 'Account Status', key: 'accountStatus' },
  { header: 'Profile Complete', key: 'profileCompleteLabel' },
  { header: 'Online', key: 'onlineLabel' },
  { header: 'Accepting Bookings', key: 'acceptingLabel' },
  { header: 'Service Areas', key: 'serviceAreasLabel' },
  { header: 'Specialties', key: 'specialtiesLabel' },
  { header: 'Bio', key: 'bio' },
  { header: 'Badges', key: 'badgesLabel' },
  { header: 'Max Radius (km)', key: 'maxRadiusKm' },
  { header: 'Latitude', key: 'latitude' },
  { header: 'Longitude', key: 'longitude' },
  { header: 'Joined', key: 'joinedLabel' },
  { header: 'Last Updated', key: 'updatedLabel' },
];

function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]).join('').toUpperCase();
}

// Avatar that shows the provider photo when present, and falls back to the
// initials block when there is no image or the image fails to load.
function ProviderAvatar({ name, src, className = 'w-12 h-12' }) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  if (showFallback) {
    return (
      <div className={`${className} rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-sm shrink-0`}>
        {initials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || 'Provider'}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
      className={`${className} rounded-xl object-cover border border-slate-200 shrink-0`}
    />
  );
}

function StatusBadge({ accountStatus, isVerified }) {
  return (
    <div className="flex flex-wrap gap-1.5 justify-end">
      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black border whitespace-nowrap ${ACCOUNT_STATUS_BADGE[accountStatus] || ACCOUNT_STATUS_BADGE.ACTIVE}`}>
        {String(accountStatus || 'ACTIVE').replace('_', ' ')}
      </span>
      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black border whitespace-nowrap ${isVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
        {isVerified ? 'Verified' : 'Unverified'}
      </span>
    </div>
  );
}

export default function AdminProvidersPanel() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [detailProvider, setDetailProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState('');
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const servicesReqId = useRef(0);

  const openServices = async (p) => {
    setDetailProvider(p);
    setServices([]);
    setServicesError('');
    setServicesLoading(true);
    // Show the list snapshot immediately, then replace it with fresh values.
    setWallet(p.wallet || null);
    setWalletLoading(true);
    const requestId = ++servicesReqId.current;

    const [servicesResult, walletResult] = await Promise.allSettled([
      api.get(`/providers/${p.id}/services`),
      api.get(`/admin/providers/${p.id}/wallet`)
    ]);

    if (requestId !== servicesReqId.current) return;

    if (servicesResult.status === 'fulfilled' && servicesResult.value.ok) {
      setServices(Array.isArray(servicesResult.value.data) ? servicesResult.value.data : []);
    } else {
      setServicesError(
        servicesResult.status === 'fulfilled'
          ? (servicesResult.value.data?.message || servicesResult.value.data?.error || 'Could not load services.')
          : 'Could not reach the server. Try again.'
      );
    }

    if (walletResult.status === 'fulfilled' && walletResult.value.ok && walletResult.value.data) {
      setWallet(walletResult.value.data);
    }

    setServicesLoading(false);
    setWalletLoading(false);
  };

  const closeServices = () => {
    servicesReqId.current += 1;
    setDetailProvider(null);
    setWallet(null);
  };

  const fetchReqId = useRef(0);

  const fetchData = useCallback(async (pageNo, limit, query) => {
    const requestId = ++fetchReqId.current;
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(pageNo), limit: String(limit) });
      if (query.trim()) q.set('search', query.trim());
      const res = await api.get(`/admin/providers?${q.toString()}`);
      if (requestId !== fetchReqId.current) return;
      if (res.ok) {
        setProviders(res.data?.providers || []);
        setTotal(res.data?.pagination?.total || 0);
        setTotalPages(res.data?.pagination?.totalPages || res.data?.pagination?.pages || 0);
      } else {
        setProviders([]);
      }
    } catch {
      if (requestId !== fetchReqId.current) return;
      setProviders([]);
    } finally {
      if (requestId === fetchReqId.current) setLoading(false);
    }
  }, []);

  // Guard on the args so React StrictMode's dev double-mount does not fire the
  // same request twice, while a real page/search change (different key) still
  // re-fetches.
  const lastFetchKeyRef = useRef('');
  useEffect(() => {
    const key = `${page}|${search}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;
    fetchData(page, PAGE_SIZE, search);
  }, [fetchData, page, search]);

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const refresh = () => fetchData(page, PAGE_SIZE, search);

  const fetchAllProviders = useCallback(async (pageNo, limit) => {
    const q = new URLSearchParams({ page: String(pageNo), limit: String(limit) });
    if (search.trim()) q.set('search', search.trim());
    const res = await api.get(`/admin/providers?${q.toString()}`);
    if (!res.ok) return { rows: [], total: 0 };
    const rows = (res.data?.providers || []).map((p) => ({
      id: p.id,
      providerNumber: p.providerNumber || null,
      name: p.name || '',
      email: p.email || '',
      phone: p.phone || '',
      category: p.category || '',
      sector: p.sector || '',
      rating: p.rating ?? 0,
      reviewCount: p.reviewCount ?? 0,
      jobsCompleted: p.jobsCompleted ?? 0,
      providerLevel: p.providerLevel || '',
      serviceFeeLabel: p.serviceFee != null ? `₹${p.serviceFee}/hr` : '',
      verificationLevel: p.verificationLevel || '',
      verifiedLabel: p.isVerified ? 'Yes' : 'No',
      featuredLabel: p.isFeatured ? 'Yes' : 'No',
      accountStatus: p.accountStatus || '',
      profileCompleteLabel: p.profileComplete ? 'Yes' : 'No',
      onlineLabel: p.isOnline ? 'Yes' : 'No',
      acceptingLabel: p.acceptingBookings ? 'Yes' : 'No',
      serviceAreasLabel: joinList(p.serviceAreas),
      specialtiesLabel: joinList(p.specialties),
      bio: p.bio || '',
      badgesLabel: (Array.isArray(p.badges) ? p.badges : []).map((b) => b.badgeType).join(', '),
      maxRadiusKm: p.maxRadiusKm ?? '',
      latitude: p.latitude ?? '',
      longitude: p.longitude ?? '',
      joinedLabel: fmt(p.createdAt),
      updatedLabel: fmt(p.updatedAt),
    }));
    return { rows, total: res.data?.pagination?.total || 0 };
  }, [search]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAllPages({
        fetchPage: fetchAllProviders,
        fileName: `providers-export-${new Date().toISOString().slice(0, 10)}`,
        sheetName: 'Providers',
        columns: PROVIDER_EXPORT_COLUMNS,
      });
    } catch (err) {
      console.error('Provider export failed:', err);
      setActionError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const runAction = async (fn, successMessage) => {
    setActionError('');
    try {
      const res = await fn();
      if (res.ok) {
        await refresh();
      } else {
        setActionError(res.data?.message || res.data?.error || 'Action failed.');
      }
    } catch {
      setActionError('Network error. Please try again.');
    }
  };

  const handleVerify = (p) => {
    setBusyId(p.id);
    runAction(() => api.patch(`/providers/${p.id}/verify`, { isVerified: !Boolean(p.isVerified) })).finally(() => setBusyId(null));
  };

  const handleStatus = (p, nextStatus) => {
    if (nextStatus === (p.accountStatus || 'ACTIVE')) return;
    const reason = window.prompt(`Reason for setting provider to ${nextStatus}:`);
    if (!reason || !reason.trim()) return;
    setBusyId(p.id);
    runAction(() => api.patch(`/admin/providers/${p.id}/status`, { status: nextStatus, reason: reason.trim() })).finally(() => setBusyId(null));
  };

  const changePage = (nextPage) => {
    if (nextPage < 1 || (totalPages > 0 && nextPage > totalPages)) return;
    setPage(nextPage);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Provider Directory</h2>
          <p className="text-slate-500 text-xs mt-0.5">Full provider records with account controls, verification, and paginated browsing.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search name, email, phone, category..."
            className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 outline-none rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[10px] font-black text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl px-4 py-3">{actionError}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded w-full" />
              <div className="h-3 bg-slate-100 rounded w-3/5" />
            </div>
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center py-16 px-6 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Inbox className="w-7 h-7" />
          </div>
          <p className="text-slate-900 text-sm font-extrabold">
            {search.trim() ? 'No providers match your search' : 'No providers yet'}
          </p>
          <p className="text-slate-500 text-xs font-medium mt-1 max-w-xs">
            {search.trim()
              ? 'Try a different name, email, phone, or category.'
              : 'Registered providers will appear here once they sign up.'}
          </p>
          <button
            type="button"
            onClick={() => { setSearch(''); }}
            className="mt-1 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> {search.trim() ? 'Clear search' : 'Refresh'}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {providers.map((p) => {
              const busy = busyId === p.id;
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 flex flex-col shadow-2xs transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 items-center min-w-0">
                      <ProviderAvatar name={p.name} src={p.avatar} />
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-900 text-sm truncate">{p.name}</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{p.providerNumber || '—'}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wide">{p.category || 'General'} Division</span>
                        </div>
                      </div>
                    </div>
                    <StatusBadge accountStatus={p.accountStatus} isVerified={p.isVerified} />
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] font-semibold text-slate-600 grid grid-cols-2 gap-x-3 gap-y-2.5">
                    <div className="min-w-0">
                      <span className="text-slate-400 uppercase text-[9px] block flex items-center gap-1"><Mail className="w-3 h-3" /> Email</span>
                      <span className="text-slate-800 font-bold block truncate">{p.email || '—'}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-400 uppercase text-[9px] block flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</span>
                      <span className="text-slate-800 font-bold block truncate">{p.phone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase text-[9px] block">Feedback</span>
                      <span className="text-amber-600 font-black flex items-center gap-1"><Star className="w-3 h-3" /> {p.rating ?? 0} <span className="text-slate-400 font-semibold">({p.reviewCount ?? 0})</span></span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase text-[9px] block">Jobs Done</span>
                      <span className="text-slate-800 font-black block">{p.jobsCompleted ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${p.isOnline ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
                        {p.isOnline ? 'Online' : 'Offline'}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${p.acceptingBookings ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {p.acceptingBookings ? 'Accepting' : 'Paused'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase border bg-slate-900 text-white border-slate-900">{p.providerLevel ?? 'L0'}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 font-semibold">Joined {fmt(p.createdAt)}</p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 font-semibold">Provider since</span>
                    <button
                      type="button"
                      onClick={() => openServices(p)}
                      className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <Layers className="w-3 h-3" /> Services &amp; Credentials
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleVerify(p)}
                        disabled={busy}
                        className={`flex items-center gap-1.5 ${p.isVerified ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-bold px-3 py-1.5 text-[10px] rounded-lg transition-colors disabled:opacity-50`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {busy ? 'Updating...' : (p.isVerified ? 'Unverify' : 'Verify Provider')}
                      </button>
                      <button
                        onClick={() => handleStatus(p, 'ON_HOLD')}
                        disabled={busy || p.accountStatus === 'ON_HOLD'}
                        className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 text-white font-bold px-3 py-1.5 text-[10px] rounded-lg transition-colors"
                      >
                        Hold
                      </button>
                      <button
                        onClick={() => handleStatus(p, 'BLOCKED')}
                        disabled={busy || p.accountStatus === 'BLOCKED'}
                        className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-bold px-3 py-1.5 text-[10px] rounded-lg transition-colors"
                      >
                        Block
                      </button>
                      <button
                        onClick={() => handleStatus(p, 'ACTIVE')}
                        disabled={busy || (p.accountStatus || 'ACTIVE') === 'ACTIVE'}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold px-3 py-1.5 text-[10px] rounded-lg transition-colors"
                      >
                        Activate
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3">
            <span className="text-[11px] font-semibold text-slate-500">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} provider{total === 1 ? '' : 's'}
            </span>
            <div className="flex items-center justify-end gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => changePage(page - 1)}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold px-3 py-2 rounded-lg text-[11px] disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="px-2 text-[11px] font-extrabold text-slate-700 tabular-nums">
                Page {page} / {Math.max(1, totalPages)}
              </span>
              <button
                type="button"
                onClick={() => changePage(page + 1)}
                disabled={page >= totalPages || totalPages === 0}
                className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold px-3 py-2 rounded-lg text-[11px] disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}

      {detailProvider && (
        <ProviderServicesModal
          provider={detailProvider}
          services={services}
          loading={servicesLoading}
          error={servicesError}
          wallet={wallet}
          walletLoading={walletLoading}
          onClose={closeServices}
        />
      )}
    </div>
  );
}

const SERVICE_STATUS_CHIP = {
  APPROVED: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  PENDING: 'bg-amber-50 border-amber-200 text-amber-700',
  DENIED: 'bg-rose-50 border-rose-200 text-rose-700',
};

function ProviderServicesModal({ provider: p, services, loading, error, wallet, walletLoading, onClose }) {
  const badges = Array.isArray(p.badges) ? p.badges : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-4">
      <div className="bg-white w-full max-w-lg my-4 rounded-2xl shadow-2xl overflow-hidden relative">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-slate-50">
          <div className="flex gap-3 items-center min-w-0">
            <ProviderAvatar name={p.name} src={p.avatar} className="w-12 h-12" />
            <div className="min-w-0">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 truncate">
                {p.name}
                {p.isVerified && <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
              </h4>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[10px] font-mono font-bold bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{p.providerNumber || '—'}</span>
                <span className="text-[10px] bg-white text-slate-600 px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wide border border-slate-200">{p.category || 'General'} Division</span>
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto max-h-[70vh]">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-indigo-600" /> Wallet
              {walletLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-400 ml-0.5" />}
            </p>
            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3 mb-3">
              <p className="text-[9px] uppercase tracking-widest font-black text-indigo-500">Current Wallet Balance</p>
              <p className={`text-2xl font-black mt-1 tabular-nums ${Number(wallet?.balance || 0) < 0 ? 'text-rose-600' : 'text-indigo-800'}`}>
                {fmtMoney(wallet?.balance)}
              </p>
              <p className="text-[9px] font-semibold text-indigo-400 mt-0.5">
                {Number(wallet?.balance || 0) < 0 ? 'Negative balance — provider owes platform commission' : 'Available for payout'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                <p className="text-[9px] uppercase tracking-widest font-black text-slate-600">Total Earned</p>
                <p className="text-base font-black text-slate-800 mt-1 tabular-nums">{fmtMoney(wallet?.totalEarned)}</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3">
                <p className="text-[9px] uppercase tracking-widest font-black text-rose-600">Total Withdrawn</p>
                <p className="text-base font-black text-rose-800 mt-1 tabular-nums">{fmtMoney(wallet?.totalWithdrawn)}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Levels
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border bg-slate-900 text-white border-slate-900">
                Provider Level · {p.providerLevel ?? 'L0'}
              </span>
              <VerificationLevelPill provider={p} />
            </div>
          </div>

          {badges.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Badges ({badges.length})
              </p>
              <ReputationBadgeStrip badges={badges} limit={20} />
              <div className="mt-2 space-y-1">
                {badges.map((b) => (
                  <p key={b.badgeType} className="text-[10px] text-slate-400 font-semibold">
                    {b.badgeType.replace('_', ' ').toLowerCase()} · awarded {fmt(b.awardedAt)}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> Services ({services.filter((s) => s.approvalStatus === 'APPROVED').length} approved)
            </p>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> <span className="text-xs font-bold">Loading services…</span>
              </div>
            ) : error ? (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl px-4 py-3">{error}</div>
            ) : services.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl py-8 px-4 text-center">
                <p className="text-xs font-extrabold text-slate-600">No services yet</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">This provider has not registered any services.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {services.map((s) => (
                  <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-900 break-words">{s.name || 'Unnamed service'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border whitespace-nowrap ${SERVICE_STATUS_CHIP[s.approvalStatus] || SERVICE_STATUS_CHIP.PENDING}`}>
                        {String(s.approvalStatus || 'PENDING').replace('_', ' ')}
                      </span>
                    </div>
                    {s.experienceYears != null && (
                      <p className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 w-fit px-1.5 py-0.5 rounded">
                        {s.experienceYears} yrs experience
                      </p>
                    )}
                    {s.description && <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{s.description}</p>}
                    {Array.isArray(s.popularIssues) && s.popularIssues.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {s.popularIssues.map((issue, idx) => (
                          <span key={idx} className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{issue}</span>
                        ))}
                      </div>
                    )}
                    {s.approvalStatus === 'DENIED' && s.denialReason && (
                      <p className="text-[10px] font-semibold text-rose-600">Denied: {s.denialReason}</p>
                    )}
                    <p className="text-[9px] text-slate-400 font-semibold">Requested {fmt(s.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}