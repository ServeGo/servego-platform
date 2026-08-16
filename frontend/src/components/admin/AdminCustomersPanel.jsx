import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Mail,
  Phone,
  MapPin,
  Gift,
  BadgeCheck,
  CircleUserRound,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../../utils/apiClient';
import { exportAllPages } from '../../utils/exportExcel';

const PAGE_SIZES = [12, 24, 48];

const CUSTOMER_EXPORT_COLUMNS = [
  { header: 'Customer ID', key: 'id' },
  { header: 'Name', key: 'name' },
  { header: 'Email', key: 'email' },
  { header: 'Phone', key: 'phone' },
  { header: 'Status', key: 'status' },
  { header: 'Profile Complete', key: 'profileCompleteLabel' },
  { header: 'Address', key: 'address' },
  { header: 'Pincode', key: 'pincode' },
  { header: 'Referral Code', key: 'referralCode' },
  { header: 'Referred By', key: 'referredBy' },
  { header: 'Referrals Count', key: 'referralsCount' },
  { header: 'Referral Discount Balance', key: 'discountBalanceLabel' },
  { header: 'Referral Bonus Earned', key: 'bonusEarnedLabel' },
  { header: 'Joined', key: 'joinedLabel' },
  { header: 'Last Updated', key: 'updatedLabel' },
];

const fmt = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const STATUS_STYLES = {
  ACTIVE: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  SUSPENDED: 'bg-amber-50 border-amber-200 text-amber-800',
  BLOCKED: 'bg-rose-50 border-rose-200 text-rose-800',
  PENDING: 'bg-slate-50 border-slate-200 text-slate-600',
};

export default function AdminCustomersPanel() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async (pageNo, limit, query) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ role: 'customer', page: String(pageNo), limit: String(limit) });
      if (query.trim()) q.set('search', query.trim());
      const res = await api.get(`/users?${q.toString()}`);
      if (res.ok) {
        setCustomers(res.data?.users || []);
        setTotal(res.data?.pagination?.total || 0);
        setTotalPages(res.data?.pagination?.pages || 0);
      } else {
        setCustomers([]);
      }
    } catch {
      setCustomers([]);
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

  const fetchAllCustomers = useCallback(async (pageNo, limit) => {
    const q = new URLSearchParams({ role: 'customer', page: String(pageNo), limit: String(limit) });
    if (search.trim()) q.set('search', search.trim());
    const res = await api.get(`/users?${q.toString()}`);
    if (!res.ok) return { rows: [], total: 0 };
    const rows = (res.data?.users || []).map((c) => ({
      id: c.id,
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      status: c.status || '',
      profileCompleteLabel: c.profileComplete ? 'Yes' : 'No',
      address: c.customerProfile?.address || c.address || '',
      pincode: c.customerProfile?.pincode || c.pincode || '',
      referralCode: c.referralCode || '',
      referredBy: c.referredBy || '',
      referralsCount: c.referralsCount ?? 0,
      discountBalanceLabel: c.referralDiscountBalance != null ? `₹${Number(c.referralDiscountBalance).toLocaleString('en-IN')}` : '',
      bonusEarnedLabel: c.referralBonusEarned != null ? `₹${Number(c.referralBonusEarned).toLocaleString('en-IN')}` : '',
      joinedLabel: fmt(c.createdAt),
      updatedLabel: fmt(c.updatedAt),
    }));
    return { rows, total: res.data?.pagination?.total || 0 };
  }, [search]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAllPages({
        fetchPage: fetchAllCustomers,
        fileName: `customers-export-${new Date().toISOString().slice(0, 10)}`,
        sheetName: 'Customers',
        columns: CUSTOMER_EXPORT_COLUMNS,
      });
    } catch (err) {
      console.error('Customer export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Customer Directory</h2>
        <p className="text-slate-500 text-xs">Registered customers with full contact and referral records, paginated for fast browsing.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search name, email, or phone..."
            className="pl-9 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-semibold">{total} customers</span>
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
              <div className="h-3 bg-slate-100 rounded mt-2 w-3/5" />
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <p className="text-slate-400 text-xs italic p-8 text-center bg-white border border-slate-100 rounded-2xl">
          {search.trim() ? 'No customers match your search.' : 'No customers found.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {customers.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 items-center min-w-0">
                    <img className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" src={c.avatar} alt={c.name} referrerPolicy="no-referrer" />
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate">{c.name}</h4>
                      <span className="text-[10px] text-slate-400 block font-mono mt-0.5 truncate">{c.id}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black border ${STATUS_STYLES[c.status] || STATUS_STYLES.ACTIVE}`}>
                    {c.status || 'ACTIVE'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] font-semibold text-slate-600 grid grid-cols-2 gap-x-3 gap-y-2">
                  <div className="col-span-2 flex items-center gap-1.5 min-w-0">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{c.email || '—'}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{c.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] block">Joined</span>
                    <span className="text-slate-800 font-black block">{fmt(c.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] block">Referrals</span>
                    <span className="text-slate-800 font-black block">{c.referralsCount ?? 0}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 min-w-0">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{c.customerProfile?.address || c.address || '—'}{c.customerProfile?.pincode || c.pincode ? ` · ${c.customerProfile?.pincode || c.pincode}` : ''}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <Gift className="w-3 h-3" /> {c.referralCode ? `Code ${c.referralCode}` : 'No referral code'}
                  </span>
                  <button onClick={() => setDetail(c)} className="text-[10px] font-black text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg hover:bg-teal-100 flex items-center gap-1">
                    <CircleUserRound className="w-3 h-3" /> View All
                  </button>
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

      {detail && <CustomerDetailDrawer customer={detail} onClose={() => setDetail(null)} />}
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

function CustomerDetailDrawer({ customer: c, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 items-center">
            <img className="w-14 h-14 rounded-2xl object-cover border border-slate-200" src={c.avatar} alt={c.name} referrerPolicy="no-referrer" />
            <div>
              <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                {c.name}
                {c.profileComplete && <BadgeCheck className="w-4 h-4 text-teal-600" />}
              </h4>
              <span className="text-[10px] text-slate-400 block font-mono">{c.id}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Account</p>
          <div className="grid grid-cols-2 gap-3">
            <Info label="Status" value={c.status || 'ACTIVE'} />
            <Info label="Profile Complete" value={c.profileComplete ? 'Yes' : 'No'} />
            <Info label="Joined" value={fmt(c.createdAt)} />
            <Info label="Last Updated" value={fmt(c.updatedAt)} />
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Contact & Address</p>
          <div className="grid grid-cols-2 gap-3">
            <Info label="Email" value={c.email} />
            <Info label="Phone" value={c.phone} />
            <Info label="Address" value={c.customerProfile?.address || c.address} />
            <Info label="Pincode" value={c.customerProfile?.pincode || c.pincode} />
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2 flex items-center gap-1"><Gift className="w-3 h-3" /> Referrals</p>
          <div className="grid grid-cols-2 gap-3">
            <Info label="Referral Code" value={c.referralCode} />
            <Info label="Referred By" value={c.referredBy} />
            <Info label="Referrals Count" value={c.referralsCount ?? 0} />
            <Info label="Discount Balance" value={c.referralDiscountBalance != null ? `₹${Number(c.referralDiscountBalance).toLocaleString('en-IN')}` : null} />
            <Info label="Bonus Earned" value={c.referralBonusEarned != null ? `₹${Number(c.referralBonusEarned).toLocaleString('en-IN')}` : null} />
          </div>
        </div>
      </div>
    </div>
  );
}
