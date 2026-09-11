import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react';
import { api } from '../utils/apiClient';
import SkeletonLoader from './SkeletonLoader';

const fmtMoney = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—';
};

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const CATEGORY_LABELS = {
  BOOKING_EARNING: 'Job earnings',
  BOOKING_REFUND: 'Booking refund',
  REFERRAL_BONUS: 'Referral bonus',
  PROMOTIONAL_CREDIT: 'Promotional credit',
  DISPUTE_REFUND: 'Dispute refund',
  WITHDRAWAL: 'Withdrawal',
  ADJUSTMENT: 'Adjustment'
};

export default function ProviderWalletAmbassador() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [w, l] = await Promise.all([
      api.get('/wallet'),
      api.get('/wallet/ledger')
    ]);
    if (w.ok) setWallet(w.data);
    if (l.ok) setTransactions(l.data?.transactions || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <SkeletonLoader type="text" count={3} />;
  }

  const balance = Number(wallet?.balance || 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Wallet & Ambassador</h3>
        <p className="text-slate-500 text-xs mt-0.5">Manage your earnings, request payouts, and grow your network with referral bonuses.</p>
      </div>

      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 rounded-3xl p-5 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute -top-14 -right-14 w-52 h-52 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-indigo-600/25 blur-3xl" />
        <div className="absolute right-4 sm:right-6 top-4 sm:top-6 bg-indigo-500 text-white text-[10px] sm:text-[11px] font-black uppercase px-2.5 sm:px-3 py-1 rounded-full shadow-md">Wallet Credits</div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-slate-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" /> Available Balance
          </div>
          <div className="mt-2 sm:mt-3 text-3xl sm:text-5xl font-black">{fmtMoney(balance)}</div>
          <p className="text-slate-400 text-[10px] sm:text-[11px] font-semibold mt-1.5 sm:mt-2">Earnings land here instantly when a booking is completed.</p>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-6 sm:mt-8">
            <div className="bg-white/10 border border-white/10 rounded-2xl p-3 sm:p-4">
              <span className="text-[9px] sm:text-[10px] text-slate-300 font-black uppercase block leading-tight">Total Earned</span>
              <span className="text-sm sm:text-lg font-black mt-1 sm:mt-1.5 block leading-none truncate">{fmtMoney(wallet?.totalEarned)}</span>
            </div>
            <div className="bg-white/10 border border-white/10 rounded-2xl p-3 sm:p-4">
              <span className="text-[9px] sm:text-[10px] text-slate-300 font-black uppercase block leading-tight">Withdrawn</span>
              <span className="text-sm sm:text-lg font-black mt-1 sm:mt-1.5 block leading-none truncate">{fmtMoney(wallet?.totalWithdrawn)}</span>
            </div>
            <div className="bg-white/10 border border-white/10 rounded-2xl p-3 sm:p-4">
              <span className="text-[9px] sm:text-[10px] text-slate-300 font-black uppercase block leading-tight">Ledger Entries</span>
              <span className="text-sm sm:text-lg font-black mt-1 sm:mt-1.5 block leading-none truncate">{wallet?.transactionCount ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-extrabold text-slate-900">Recent Transactions</span>
          <button onClick={load} className="text-[10px] font-black text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        {transactions.length === 0 ? (
          <p className="text-slate-400 text-xs italic p-8 text-center">No transactions yet. Your earnings will appear here.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.slice(0, 12).map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  t.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                }`}>
                  {t.type === 'CREDIT' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-800 truncate">{CATEGORY_LABELS[t.category] || t.category}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{fmtDate(t.createdAt)}{t.description ? ` · ${t.description}` : ''}</p>
                </div>
                <div className={`text-sm font-black whitespace-nowrap ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {t.type === 'CREDIT' ? '+' : '−'}{fmtMoney(t.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
