import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowDownLeft, ArrowUpRight, RefreshCw, Gift, Sparkles, ShieldCheck } from 'lucide-react';
import { api } from '../utils/apiClient';

const fmtMoney = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—';
};

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const CATEGORY_META = {
  REFERRAL_BONUS: { label: 'Referral bonus', icon: Gift, tone: 'bg-indigo-50 text-indigo-600' },
  PROMOTIONAL_CREDIT: { label: 'Promotional credit', icon: Sparkles, tone: 'bg-amber-50 text-amber-600' },
  BOOKING_REFUND: { label: 'Booking refund', icon: ShieldCheck, tone: 'bg-sky-50 text-sky-600' },
  DISPUTE_REFUND: { label: 'Dispute refund', icon: ShieldCheck, tone: 'bg-teal-50 text-teal-600' },
  ADJUSTMENT: { label: 'Adjustment', icon: Sparkles, tone: 'bg-slate-100 text-slate-600' },
  BOOKING_EARNING: { label: 'Credit', icon: ArrowDownLeft, tone: 'bg-emerald-50 text-emerald-600' },
  WITHDRAWAL: { label: 'Debit', icon: ArrowUpRight, tone: 'bg-rose-50 text-rose-500' }
};

export default function WalletView() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [w, l] = await Promise.all([api.get('/wallet'), api.get('/wallet/ledger')]);
    if (w.ok) setWallet(w.data);
    if (l.ok) setTransactions(l.data?.transactions || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-400 text-xs font-semibold">
        Loading wallet...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute right-6 top-6 bg-indigo-500 text-white text-[11px] font-black uppercase px-3 py-1 rounded-full shadow-md">Credits Wallet</div>
        <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-widest">
          <Wallet className="w-4 h-4 text-indigo-400" /> Available Credits
        </div>
        <div className="mt-3 text-4xl sm:text-5xl font-black">{fmtMoney(wallet?.balance)}</div>
        <p className="text-slate-400 text-[11px] font-semibold mt-2">
          Referral bonuses, refunds and promotional credits land here. Wallet credits cover your future bookings.
        </p>

        <div className="grid grid-cols-3 gap-3 mt-8">
          <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
            <span className="text-[10px] text-slate-300 font-black uppercase block">Credited</span>
            <span className="text-lg font-black mt-1 block">{fmtMoney(wallet?.totalCredited)}</span>
          </div>
          <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
            <span className="text-[10px] text-slate-300 font-black uppercase block">Debited</span>
            <span className="text-lg font-black mt-1 block">{fmtMoney(wallet?.totalDebited)}</span>
          </div>
          <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
            <span className="text-[10px] text-slate-300 font-black uppercase block">Entries</span>
            <span className="text-lg font-black mt-1 block">{wallet?.transactionCount ?? 0}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-extrabold text-slate-900">Transaction History</span>
          <button onClick={load} className="text-[10px] font-black text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        {transactions.length === 0 ? (
          <p className="text-slate-400 text-xs italic p-8 text-center">No transactions yet. Refer a friend or earn refunds to see credits here.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((t) => {
              const meta = CATEGORY_META[t.category] || CATEGORY_META[t.type === 'DEBIT' ? 'WITHDRAWAL' : 'BOOKING_EARNING'];
              const Icon = meta.icon;
              return (
                <div key={t.id} className="flex items-center gap-3 p-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.tone}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-slate-800 truncate">{meta.label}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{fmtDate(t.createdAt)}{t.description ? ` · ${t.description}` : ''}</p>
                  </div>
                  <div className={`text-sm font-black whitespace-nowrap ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {t.type === 'CREDIT' ? '+' : '−'}{fmtMoney(t.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
