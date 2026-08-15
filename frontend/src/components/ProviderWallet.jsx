import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowDownLeft, ArrowUpRight, Send, RefreshCw, AlertTriangle, CheckCircle2, Banknote } from 'lucide-react';
import { api } from '../utils/apiClient';
import { getErrorMessage } from '../utils/errorMessages';
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

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 border-amber-300 text-amber-800',
  APPROVED: 'bg-sky-100 border-sky-300 text-sky-800',
  REJECTED: 'bg-rose-100 border-rose-300 text-rose-800',
  PAID: 'bg-emerald-100 border-emerald-300 text-emerald-800'
};

export default function ProviderWallet({ providerId }) {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [config, setConfig] = useState({ minimumWithdrawal: 100, maximumWithdrawal: 0, note: '' });
  const [loading, setLoading] = useState(true);

  // Withdrawal form
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('ok');

  const load = useCallback(async () => {
    setLoading(true);
    const [w, l, wd, cfg] = await Promise.all([
      api.get('/wallet'),
      api.get('/wallet/ledger'),
      api.get('/wallet/withdrawals'),
      api.get('/wallet/withdrawal/config')
    ]);
    if (w.ok) setWallet(w.data);
    if (l.ok) setTransactions(l.data?.transactions || []);
    if (wd.ok) setWithdrawals(Array.isArray(wd.data) ? wd.data : []);
    if (cfg.ok) setConfig(cfg.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (tone, text) => {
    setMessageTone(tone);
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const submitWithdrawal = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const accountDetails = { upiId: upiId.trim() || null, accountNumber: accountNumber.trim() || null, ifsc: ifsc.trim() || null };
    const res = await api.post('/wallet/withdrawals', { amount: Number(amount), accountDetails, description: description.trim() || null });
    setSubmitting(false);
    if (res.ok) {
      flash('ok', `Withdrawal request of ${fmtMoney(amount)} submitted for admin review.`);
      setAmount(''); setUpiId(''); setAccountNumber(''); setIfsc(''); setDescription('');
      load();
    } else {
      flash('err', getErrorMessage(res.data, 'Failed to request withdrawal.'));
    }
  };

  if (loading) {
    return <SkeletonLoader type="text" count={3} />;
  }

  const balance = Number(wallet?.balance || 0);

  return (
    <div className="space-y-6">
      {message && (
        <div className={`flex items-center gap-2 text-xs font-bold rounded-2xl px-4 py-3 border ${
          messageTone === 'ok'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {messageTone === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Balance card */}
        <div className="md:col-span-7 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute right-6 top-6 bg-indigo-500 text-white text-[11px] font-black uppercase px-3 py-1 rounded-full shadow-md">Wallet Credits</div>
          <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-widest">
            <Wallet className="w-4 h-4 text-indigo-400" /> Available Balance
          </div>
          <div className="mt-3 text-4xl sm:text-5xl font-black">{fmtMoney(balance)}</div>
          <p className="text-slate-400 text-[11px] font-semibold mt-2">Earnings land here instantly when a booking is completed. Withdraw once approved by the admin.</p>

          <div className="grid grid-cols-3 gap-3 mt-8">
            <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] text-slate-300 font-black uppercase block">Total Earned</span>
              <span className="text-lg font-black mt-1 block">{fmtMoney(wallet?.totalEarned)}</span>
            </div>
            <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] text-slate-300 font-black uppercase block">Withdrawn</span>
              <span className="text-lg font-black mt-1 block">{fmtMoney(wallet?.totalWithdrawn)}</span>
            </div>
            <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] text-slate-300 font-black uppercase block">Ledger Entries</span>
              <span className="text-lg font-black mt-1 block">{wallet?.transactionCount ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Withdrawal form */}
        <div className="md:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-600" />
            <h4 className="text-lg font-black text-slate-900 leading-none">Request Payout</h4>
          </div>
          <form onSubmit={submitWithdrawal} className="mt-5 space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">Amount (₹)</label>
              <input
                type="number"
                min={config.minimumWithdrawal}
                max={config.maximumWithdrawal > 0 ? config.maximumWithdrawal : undefined}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min ${config.minimumWithdrawal}`}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 px-4 py-3 rounded-xl outline-none transition-all text-sm font-black"
              />
              {config.maximumWithdrawal > 0 && (
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Max {fmtMoney(config.maximumWithdrawal)} per request</p>
              )}
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">UPI ID</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="name@upi"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 px-4 py-3 rounded-xl outline-none transition-all text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">Account No.</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 px-3 py-3 rounded-xl outline-none transition-all text-sm font-semibold"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">IFSC</label>
                <input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 px-3 py-3 rounded-xl outline-none transition-all text-sm font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">Note (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 px-4 py-3 rounded-xl outline-none transition-all text-sm font-semibold"
              />
            </div>

            {config.note && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold rounded-xl p-3">{config.note}</div>
            )}

            <button
              type="submit"
              disabled={submitting || balance < Number(config.minimumWithdrawal || 0)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-black p-3.5 rounded-xl shadow-sm outline-none transition-all flex items-center justify-center gap-2"
            >
              <Banknote className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Request Withdrawal'}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Ledger */}
        <div className="md:col-span-7 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
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

        {/* Withdrawal history */}
        <div className="md:col-span-5 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100">
            <span className="text-sm font-extrabold text-slate-900">Payout Requests</span>
          </div>
          {withdrawals.length === 0 ? (
            <p className="text-slate-400 text-xs italic p-8 text-center">No payout requests yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {withdrawals.map((w) => (
                <div key={w.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">{fmtMoney(w.amount)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${STATUS_STYLES[w.status] || 'bg-slate-100 border-slate-300 text-slate-600'}`}>{w.status}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">{fmtDate(w.createdAt)}{w.description ? ` · ${w.description}` : ''}</p>
                  {w.adminNote && <p className="text-[10px] text-slate-500 font-bold mt-1 bg-slate-50 border border-slate-100 rounded-lg p-2">Admin: {w.adminNote}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
