import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldCheck,
  BadgeCheck,
  X,
  Phone,
  Mail,
  MapPin,
  Layers,
  RefreshCw,
  FileSpreadsheet,
  CircleUserRound
} from 'lucide-react';
import { api } from '../../utils/apiClient';
import { exportAllPages } from '../../utils/exportExcel';

const PAGE_SIZES = [12, 24, 48];

const ACCOUNT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Activate', cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  { value: 'ON_HOLD', label: 'Hold', cls: 'bg-amber-500 hover:bg-amber-600 text-white' },
  { value: 'BLOCKED', label: 'Block', cls: 'bg-rose-600 hover:bg-rose-700 text-white' },
];

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
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—';
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
  { header: 'Provider ID', key: 'id' },
  { header: 'Name', key: 'name' },
  { header: 'Email', key: 'email' },
  { header: 'Phone', key: 'phone' },
  { header: 'Category', key: 'category' },
  { header: 'Sector', key: 'sector' },
  { header: 'Rating', key: 'rating' },
  { header: 'Reviews', key: 'reviewCount' },
  { header: 'Jobs Completed', key: 'jobsCompleted' },
  { header: 'Experience (Years)', key: 'experienceYears' },
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
  { header: 'Referral Code', key: 'referralCode' },
  { header: 'Referrals Count', key: 'referralsCount' },
  { header: 'Badges', key: 'badgesLabel' },
  { header: 'Max Radius (km)', key: 'maxRadiusKm' },
  { header: 'Latitude', key: 'latitude' },
  { header: 'Longitude', key: 'longitude' },
  { header: 'Joined', key: 'joinedLabel' },
  { header: 'Last Updated', key: 'updatedLabel' },
];

function StatusBadge({ accountStatus, isVerified }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black border ${ACCOUNT_STATUS_BADGE[accountStatus] || ACCOUNT_STATUS_BADGE.ACTIVE}`}>
        {String(accountStatus || 'ACTIVE').replace('_', ' ')}
      </span>
      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black border ${isVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
        {isVerified ? 'Verified' : 'Unverified'}
      </span>
    </div>
  );
}

export default function AdminProvidersPanel() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [detail, setDetail] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async (pageNo, limit, query) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(pageNo), limit: String(limit) });
      if (query.trim()) q.set('search', query.trim());
      const res = await api.get(`/admin/providers?${q.toString()}`);
      if (res.ok) {
        setProviders(res.data?.providers || []);
        setTotal(res.data?.pagination?.total || 0);
        setTotalPages(res.data?.pagination?.totalPages || 0);
      } else {
        setProviders([]);
      }
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(page, pageSize, search);
  }, [fetchData, page, pageSize, search]);

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const changePageSize = (size) => {
    setPageSize(size);
    setPage(1);
  };

  const refresh = () => fetchData(page, pageSize, search);

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
      experienceYears: p.experienceYears ?? 0,
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
      referralCode: p.referralCode || '',
      referralsCount: p.referralsCount ?? 0,
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Provider Directory</h2>
        <p className="text-slate-500 text-xs">Full provider records with account controls, verification, and paginated browsing.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search name, email, phone, category..."
            className="pl-9 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-semibold">{total} providers</span>
          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black px-3 py-2 rounded-lg transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <button onClick={refresh} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl px-4 py-3">{actionError}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded mt-4 w-full" />
              <div className="h-3 bg-slate-100 rounded mt-2 w-4/5" />
            </div>
          ))}
        </div>
      ) : providers.length === 0 ? (
        <p className="text-slate-400 text-xs italic p-8 text-center bg-white border border-slate-100 rounded-2xl">
          {search.trim() ? 'No providers match your search.' : 'No providers found.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {providers.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 items-center min-w-0">
                    <img className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" src={p.avatar} alt={p.name} referrerPolicy="no-referrer" />
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate">{p.name}</h4>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded inline-block mt-1 mr-1">{p.providerNumber || p.id}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wide inline-block mt-1">
                        {p.category || 'General'} Division
                      </span>
                    </div>
                  </div>
                  <StatusBadge accountStatus={p.accountStatus} isVerified={p.isVerified} />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] font-semibold text-slate-600 grid grid-cols-2 gap-x-3 gap-y-2">
                  <div className="col-span-2 flex items-center gap-1.5 min-w-0">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{p.email || '—'}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{p.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] block">Specialist Rate</span>
                    <span className="text-slate-800 font-black block">{fmtMoney(p.serviceFee)}/hr</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] block">Feedback</span>
                    <span className="text-amber-600 font-black flex items-center gap-1"><Star className="w-3 h-3" /> {p.rating ?? 0} <span className="text-slate-400 font-semibold">({p.reviewCount ?? 0})</span></span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] block">Jobs Done</span>
                    <span className="text-slate-800 font-black block">{p.jobsCompleted ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] block">Experience</span>
                    <span className="text-slate-800 font-black block">{p.experienceYears ?? 0} yrs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
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

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-semibold">Joined {fmt(p.createdAt)}</span>
                  <button onClick={() => setDetail(p)} className="text-[10px] font-black text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg hover:bg-teal-100 flex items-center gap-1">
                    <CircleUserRound className="w-3 h-3" /> View All
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => handleVerify(p)}
                      disabled={busyId === p.id}
                      className={`flex items-center gap-1.5 ${p.isVerified ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-bold px-3 py-1.5 text-[10px] rounded-lg transition-colors disabled:opacity-50`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {busyId === p.id ? 'Updating...' : (p.isVerified ? 'Unverify' : 'Verify Provider')}
                    </button>
                    <button
                      onClick={() => handleStatus(p, 'ON_HOLD')}
                      disabled={busyId === p.id || p.accountStatus === 'ON_HOLD'}
                      className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 text-white font-bold px-3 py-1.5 text-[10px] rounded-lg transition-colors"
                    >
                      Hold
                    </button>
                    <button
                      onClick={() => handleStatus(p, 'BLOCKED')}
                      disabled={busyId === p.id || p.accountStatus === 'BLOCKED'}
                      className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-bold px-3 py-1.5 text-[10px] rounded-lg transition-colors"
                    >
                      Block
                    </button>
                    <button
                      onClick={() => handleStatus(p, 'ACTIVE')}
                      disabled={busyId === p.id || (p.accountStatus || 'ACTIVE') === 'ACTIVE'}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold px-3 py-1.5 text-[10px] rounded-lg transition-colors"
                    >
                      Activate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-semibold">Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => changePageSize(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold outline-none"
              >
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Page {page} of {Math.max(1, totalPages)}</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages || totalPages === 0}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {detail && <ProviderDetailDrawer provider={detail} onClose={() => setDetail(null)} onChanged={(updated) => { setDetail(updated); refresh(); }} />}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
      <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">{label}</p>
      <p className="text-xs font-bold text-slate-800 break-words">{value || '—'}</p>
    </div>
  );
}

function ProviderDetailDrawer({ provider: p, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.patch(`/providers/${p.id}/verify`, { isVerified: !Boolean(p.isVerified) });
      if (res.ok) {
        onChanged({ ...p, isVerified: !Boolean(p.isVerified) });
      } else {
        setError(res.data?.message || 'Failed to update verification.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  };

  const handleStatus = async (nextStatus) => {
    if (nextStatus === (p.accountStatus || 'ACTIVE')) return;
    const reason = window.prompt(`Reason for setting provider to ${nextStatus}:`);
    if (!reason || !reason.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.patch(`/admin/providers/${p.id}/status`, { status: nextStatus, reason: reason.trim() });
      if (res.ok) {
        onChanged({ ...p, accountStatus: nextStatus });
      } else {
        setError(res.data?.message || 'Failed to update status.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  };

  const areas = asList(p.serviceAreas);
  const specialties = asList(p.specialties);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 items-center">
            <img className="w-14 h-14 rounded-2xl object-cover border border-slate-200" src={p.avatar} alt={p.name} referrerPolicy="no-referrer" />
            <div>
              <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                {p.name}
                {p.isVerified && <BadgeCheck className="w-4 h-4 text-teal-600" />}
              </h4>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wide inline-block mt-1">
                {p.category || 'General'} Division
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl px-4 py-3">{error}</div>}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleVerify}
            disabled={busy}
            className={`flex items-center gap-1.5 ${p.isVerified ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-bold px-3 py-1.5 text-[10px] rounded-lg transition-colors disabled:opacity-50`}
          >
            <ShieldCheck className="w-3 h-3" /> {busy ? 'Updating...' : (p.isVerified ? 'Unverify Provider' : 'Verify Provider')}
          </button>
          {(['ACTIVE', 'ON_HOLD', 'BLOCKED'].filter((s) => s !== (p.accountStatus || 'ACTIVE'))).map((s) => (
            <button
              key={s}
              onClick={() => handleStatus(s)}
              disabled={busy}
              className={`${s === 'BLOCKED' ? 'bg-rose-600 hover:bg-rose-700' : s === 'ON_HOLD' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-bold px-3 py-1.5 text-[10px] rounded-lg transition-colors disabled:opacity-50`}
            >
              {s === 'ACTIVE' ? 'Activate' : s === 'ON_HOLD' ? 'Hold' : 'Block'}
            </button>
          ))}
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Account</p>
          <div className="grid grid-cols-2 gap-3">
            <Info label="Account Status" value={p.accountStatus || 'ACTIVE'} />
            <Info label="Verification" value={p.isVerified ? 'Verified' : 'Unverified'} />
            <Info label="Verification Level" value={p.verificationLevel} />
            <Info label="Provider Level" value={p.providerLevel || 'L0'} />
            <Info label="Sector" value={p.sector || 'GENERAL'} />
            <Info label="Profile Complete" value={p.profileComplete ? 'Yes' : 'No'} />
            <Info label="Online Status" value={p.isOnline ? 'Online' : 'Offline'} />
            <Info label="Accepting Bookings" value={p.acceptingBookings ? 'Yes' : 'No'} />
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Contact & Location</p>
          <div className="grid grid-cols-2 gap-3">
            <Info label="Email" value={p.email} />
            <Info label="Phone" value={p.phone} />
            <Info label="Max Radius" value={p.maxRadiusKm != null ? `${p.maxRadiusKm} km` : null} />
            <Info label="Coordinates" value={p.latitude != null ? `${Number(p.latitude).toFixed(4)}, ${Number(p.longitude).toFixed(4)}` : null} />
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Performance & Pricing</p>
          <div className="grid grid-cols-2 gap-3">
            <Info label="Specialist Rate" value={`${fmtMoney(p.serviceFee)}/hr`} />
            <Info label="Rating" value={p.rating != null ? `${Number(p.rating).toFixed(1)} / 5 (${p.reviewCount ?? 0} reviews)` : null} />
            <Info label="Jobs Completed" value={p.jobsCompleted ?? 0} />
            <Info label="Experience" value={p.experienceYears != null ? `${p.experienceYears} years` : null} />
            <Info label="Referral Code" value={p.referralCode} />
            <Info label="Referrals" value={p.referralsCount ?? 0} />
          </div>
        </div>

        {areas.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> Service Areas</p>
            <div className="flex flex-wrap gap-1.5">
              {areas.map((a) => (
                <span key={a} className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-100">{a}</span>
              ))}
            </div>
          </div>
        )}

        {specialties.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2 flex items-center gap-1"><Layers className="w-3 h-3" /> Specialties</p>
            <div className="flex flex-wrap gap-1.5">
              {specialties.map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200">{s}</span>
              ))}
            </div>
          </div>
        )}

        {p.badges?.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Badges</p>
            <div className="flex flex-wrap gap-1.5">
              {p.badges.map((b, i) => (
                <span key={i} className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">{b.badgeType?.replaceAll('_', ' ')}</span>
              ))}
            </div>
          </div>
        )}

        {p.bio && (
          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Bio</p>
            <p className="text-xs font-semibold text-slate-700 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">"{p.bio}"</p>
          </div>
        )}

        <div>
          <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Joined</p>
          <p className="text-xs font-bold text-slate-800">{fmt(p.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}
