import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowDownLeft, ArrowUpRight, Send, RefreshCw, AlertTriangle, CheckCircle2, Banknote, Copy, Check, Gift } from 'lucide-react';
import { api } from '../utils/apiClient';
import { getErrorMessage } from '../utils/errorMessages';
import { useAuth } from '../context/AppContext';
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

export default function ProviderWalletAmbassador({ provider }) {
  const { currentUser, applyReferralCode } = useAuth();

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [config, setConfig] = useState({ minimumWithdrawal: 100, maximumWithdrawal: 0, note: '' });
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('ok');

  const [referralInput, setReferralInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [refError, setRefError] = useState('');
  const [refSuccess, setRefSuccess] = useState('');

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

  const handleCopy = () => {
    navigator.clipboard.writeText(provider?.referralCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyReferral = async (e) => {
    e.preventDefault();
    const res = await applyReferralCode(referralInput);
    if (res.success) {
      setRefSuccess(res.message);
      setRefError('');
      setReferralInput('');
    } else {
      setRefError(res.message);
      setRefSuccess('');
    }
  };

  if (loading) {
    return <SkeletonLoader type="text" count={3} />;
  }

  const balance = Number(wallet?.balance || 0);
  const referredBy = currentUser?.referredBy;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Wallet & Ambassador</h3>
        <p className="text-slate-500 text-xs mt-0.5">Manage your earnings, request payouts, and grow your network with referral bonuses.</p>
      </div>

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
        <div className="md:col-span-7 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute -top-14 -right-14 w-52 h-52 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-indigo-600/25 blur-3xl" />
          <div className="absolute right-6 top-6 bg-indigo-500 text-white text-[11px] font-black uppercase px-3 py-1 rounded-full shadow-md">Wallet Credits</div>
          <div className="relative z-10">
          <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-widest">
            <Wallet className="w-4 h-4 text-indigo-400" /> Available Balance
          </div>
          <div className="mt-3 text-4xl sm:text-5xl font-black">{fmtMoney(balance)}</div>
          <p className="text-slate-400 text-[11px] font-semibold mt-2">Earnings land here instantly when a booking is completed. Withdraw once approved by the admin.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
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
        </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-lg font-black text-slate-900 leading-none">Ambassador Credentials</h4>
              <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-black uppercase px-2.5 py-1 rounded-full">₹500 per signup</span>
            </div>
            <p className="text-slate-500 text-xs mt-2 font-semibold">Invite fellow professionals to register. Get ₹500 bonus on their first completed job. No ceilings.</p>
          </div>
          <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <span className="text-[9px] text-slate-400 font-black uppercase block mb-2">My Referral Code</span>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-center">
              <div className="bg-indigo-50 border border-dashed border-indigo-300 rounded-xl px-4 py-3 font-mono font-black text-lg text-indigo-700 select-all">{provider?.referralCode || 'PRO-CODE'}</div>
              <button onClick={handleCopy} className="bg-slate-900 hover:bg-slate-800 text-xs font-black text-white px-5 rounded-xl transition-colors py-3 sm:py-0 outline-none flex items-center justify-center gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Code'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl">
              <span className="text-[10px] text-emerald-800 font-black uppercase block">Earnings Bonus</span>
              <span className="text-2xl font-black text-emerald-800 mt-2 block">₹{provider?.referralsEarningsBonus || 0}</span>
            </div>
            <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl">
              <span className="text-[10px] text-indigo-800 font-black uppercase block">Signups Count</span>
              <span className="text-2xl font-black text-indigo-900 mt-2 block">{provider?.referralsCount || 0}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <h4 className="text-lg font-black text-slate-900 leading-none">Claim Welcome Bonus</h4>
          <form onSubmit={handleApplyReferral} className="my-5 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <Gift className="w-3.5 h-3.5 text-indigo-500" /> Sponsor code
            </div>
            <input type="text" placeholder="Enter sponsor code..." value={referralInput} onChange={(e) => setReferralInput(e.target.value)} disabled={!!referredBy} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 font-mono text-xs font-black px-4 py-3 rounded-xl outline-none transition-all uppercase" />
            {refError && <div className="text-[10px] text-rose-700 bg-rose-50 border border-rose-100 font-black p-2 rounded-lg">⚠ {refError}</div>}
            {refSuccess && <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 font-black p-2 rounded-lg">🎉 {refSuccess}</div>}
            {referredBy ? (
              <div className="text-xs text-slate-600 font-black text-center bg-slate-100 rounded-xl p-3 border border-slate-200">✔ Sponsor: <span className="text-indigo-600 font-mono">{referredBy}</span></div>
            ) : (
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black p-3 rounded-xl shadow-sm outline-none transition-all">Claim ₹250 Credit</button>
            )}
          </form>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-[10px] text-slate-400 font-bold leading-relaxed italic">🔒 verification audit passes within 24 hours.</div>
        </div>
      </div>
    </div>
  );
}
