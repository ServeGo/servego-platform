import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowDownLeft, ArrowUpRight, RefreshCw, Gift, Sparkles, ShieldCheck, CreditCard, IndianRupee } from 'lucide-react';
import { useApp } from '../context/AppContext';
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
  const { currentUser } = useApp();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [feeStatus, setFeeStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payingFee, setPayingFee] = useState(false);
  const [feeError, setFeeError] = useState('');
  const [feeSuccess, setFeeSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [w, l, f] = await Promise.all([api.get('/wallet'), api.get('/wallet/ledger'), api.get('/platform-fee/status')]);
    if (w.ok) setWallet(w.data);
    if (l.ok) setTransactions(l.data?.transactions || []);
    if (f.ok) setFeeStatus(f.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadRazorpayScript = () =>
    new Promise((resolve, reject) => {
      if (window.Razorpay) return resolve();
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load payment gateway.'));
      document.body.appendChild(s);
    });

  const handlePayFee = async () => {
    if (!feeStatus?.enabled) return;
    setPayingFee(true);
    setFeeError('');
    setFeeSuccess('');
    try {
      const res = await api.post('/platform-fee/order', {});
      if (!res.ok) {
        setFeeError(res.data?.message || res.data?.error || 'Failed to start the platform fee payment.');
        setPayingFee(false);
        return;
      }

      if (!window.Razorpay) await loadRazorpayScript();
      const order = res.data;
      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amountPaise,
        currency: order.currency || 'INR',
        name: 'ServeGo',
        description: `Monthly platform fee — ${fmtMoney(order.amountInr)}`,
        prefill: { name: currentUser?.name || '', email: currentUser?.email || '' },
        theme: { color: '#6366f1' },
        handler: async (response) => {
          try {
            const verifyRes = await api.post('/platform-fee/verify', {
              transactionId: order.transactionId,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            });
            if (verifyRes.ok) {
              setFeeSuccess('Platform fee paid. Your billing window is advanced for another month.');
            } else {
              setFeeError(verifyRes.data?.message || verifyRes.data?.error || 'Payment verification failed.');
            }
            await load();
          } catch (e) {
            setFeeError('Network error while confirming your payment.');
            await load();
          } finally {
            setPayingFee(false);
          }
        },
        modal: { ondismiss: () => setPayingFee(false) }
      });
      rzp.on('payment.failed', (resp) => {
        setFeeError(resp?.error?.description || 'Payment failed. Please try again.');
        setPayingFee(false);
      });
      rzp.open();
    } catch (e) {
      setFeeError(e.message || 'Network error during payment.');
      setPayingFee(false);
    }
  };

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

      {feeStatus && (
        <div className={`bg-white border rounded-3xl p-5 ${feeStatus.overdue ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'}`}>
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-indigo-500" /> Monthly Platform Fee
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <h4 className="text-lg font-extrabold text-slate-900">{fmtMoney(feeStatus.amount)} <span className="text-xs font-bold text-slate-400">/ month</span></h4>
                {feeStatus.overdue ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase rounded-full border bg-rose-50 text-rose-700 border-rose-200 px-2.5 py-1">
                    Overdue
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 px-2.5 py-1">
                    Up to date
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-semibold mt-1.5">
                {feeStatus.overdue
                  ? `Payment due since ${fmtDate(feeStatus.dueAt)}. Pay now to keep using ServeGo.`
                  : feeStatus.dueAt
                    ? `Next payment due ${fmtDate(feeStatus.dueAt)}.`
                    : 'A small recurring fee keeps the ServeGo platform running. Manage it right here.'}
              </p>
              {feeError && <p className="text-[11px] font-bold text-rose-600 mt-1.5">{feeError}</p>}
              {feeSuccess && <p className="text-[11px] font-bold text-emerald-600 mt-1.5">{feeSuccess}</p>}
            </div>
            {feeStatus.enabled && (
              <button
                onClick={handlePayFee}
                disabled={payingFee}
                className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl px-5 py-2.5 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CreditCard className="w-3.5 h-3.5" />
                {payingFee ? 'Processing...' : `Pay ${fmtMoney(feeStatus.amount)}`}
              </button>
            )}
          </div>
        </div>
      )}

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
