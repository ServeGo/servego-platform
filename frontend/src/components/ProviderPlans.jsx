import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Zap,
  CheckCircle2,
  IndianRupee,
  Sparkles,
  AlertTriangle,
  Receipt,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/apiClient';

const SECTOR_STYLES = {
  GENERAL: 'bg-slate-100 border-slate-200 text-slate-700',
  PREMIUM: 'bg-amber-100 border-amber-300 text-amber-800'
};

const fmtMoney = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—';
};

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function ProviderPlans({ providerId }) {
  const { currentUser } = useApp();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [remainingState, setRemainingState] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [feeStatus, setFeeStatus] = useState(null);
  const [feeHistory, setFeeHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [payingFee, setPayingFee] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ONLINE');
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    if (!providerId) return;
    setLoading(true);
    try {
      const [plansRes, subRes, remainingRes, txRes, feeRes, feeHistoryRes] = await Promise.all([
        api.get('/subscriptions/plans'),
        api.get('/subscriptions/me'),
        api.get('/subscriptions/remaining'),
        api.get('/subscriptions/transactions'),
        api.get('/platform-fee/status'),
        api.get('/platform-fee/history')
      ]);
      if (plansRes.ok) setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      if (subRes.ok) setSubscription(subRes.data);
      if (remainingRes.ok) setRemainingState(remainingRes.data);
      if (txRes.ok) setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
      if (feeRes.ok) setFeeStatus(feeRes.data);
      if (feeHistoryRes.ok) setFeeHistory(Array.isArray(feeHistoryRes.data) ? feeHistoryRes.data : []);
      setError('');
    } catch (e) {
      setError('Failed to load subscription data.');
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadRazorpayScript = () =>
    new Promise((resolve, reject) => {
      if (window.Razorpay) return resolve();
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load the payment gateway.'));
      document.body.appendChild(script);
    });

  const handlePurchase = async (plan) => {
    if (plan.isFree) return;
    const price = Number(plan.finalPrice ?? plan.price ?? 0);
    if (!window.confirm(`Purchase ${plan.name} for ${fmtMoney(price)}?`)) return;
    setPurchasing(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/subscriptions/purchase', {
        planLevel: plan.level,
        paymentMethod
      });
      if (!res.ok) {
        setError(res.data?.message || res.data?.error || 'Purchase failed.');
        setPurchasing(false);
        return;
      }

      // Cash/manual path — already activated server-side.
      if (res.data?.transaction?.paymentStatus === 'PAID') {
        setSuccess(`Subscription activated. ${res.data.finalAmount != null ? `Paid ${fmtMoney(res.data.finalAmount)}. ` : ''}Leads credited — start accepting requests!`);
        setPurchasing(false);
        await load();
        return;
      }

      // Online path — open the Razorpay checkout.
      if (!window.Razorpay) await loadRazorpayScript();
      const order = res.data;
      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amountPaise,
        currency: order.currency || 'INR',
        name: 'ServeGo',
        description: `${plan.name} — ${plan.leadCount} lead${plan.leadCount !== 1 ? 's' : ''}`,
        prefill: {
          name: currentUser?.name || '',
          email: currentUser?.email || ''
        },
        theme: { color: '#0f766e' },
        handler: async (response) => {
          try {
            const verifyRes = await api.post('/subscriptions/payment/verify', {
              transactionId: order.transactionId,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            });
            if (verifyRes.ok) {
              setSuccess(`Payment successful. ${fmtMoney(verifyRes.data?.finalAmount ?? price)} paid — leads credited!`);
            } else {
              setError(verifyRes.data?.message || verifyRes.data?.error || 'Payment verification failed.');
            }
            await load();
          } catch (e) {
            setError('Network error while confirming your payment.');
            await load();
          } finally {
            setPurchasing(false);
          }
        },
        modal: {
          ondismiss: () => setPurchasing(false)
        }
      });
      rzp.on('payment.failed', (resp) => {
        setError(resp?.error?.description || 'Payment failed. Please try again.');
        setPurchasing(false);
      });
      rzp.open();
    } catch (e) {
      setError(e.message || 'Network error during purchase.');
      setPurchasing(false);
    }
  };

  const activePlanLevel = subscription?.level ?? 0;
  const hasActivePlan = Boolean(remainingState?.active ?? (Number(subscription?.remainingLeads) > 0 && subscription?.paymentStatus === 'PAID'));
  const levelDiscount = plans.find((p) => p.level === activePlanLevel)?.discountPercent ?? 0;

  // Only ever show the provider's current level plan and the next level up.
  const nextPlanLevel = activePlanLevel + 1;
  const visiblePlans = plans.filter((p) => p.level === activePlanLevel || p.level === nextPlanLevel);

  const handlePayFee = async () => {
    if (!feeStatus?.enabled) return;
    setPayingFee(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/platform-fee/order', {});
      if (!res.ok) {
        setError(res.data?.message || res.data?.error || 'Failed to start the platform fee payment.');
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
        prefill: {
          name: currentUser?.name || '',
          email: currentUser?.email || ''
        },
        theme: { color: '#0f766e' },
        handler: async (response) => {
          try {
            const verifyRes = await api.post('/platform-fee/verify', {
              transactionId: order.transactionId,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            });
            if (verifyRes.ok) {
              setSuccess('Platform fee paid. Your billing window is advanced for another month.');
            } else {
              setError(verifyRes.data?.message || verifyRes.data?.error || 'Payment verification failed.');
            }
            await load();
          } catch (e) {
            setError('Network error while confirming your payment.');
            await load();
          } finally {
            setPayingFee(false);
          }
        },
        modal: {
          ondismiss: () => setPayingFee(false)
        }
      });
      rzp.on('payment.failed', (resp) => {
        setError(resp?.error?.description || 'Payment failed. Please try again.');
        setPayingFee(false);
      });
      rzp.open();
    } catch (e) {
      setError(e.message || 'Network error during payment.');
      setPayingFee(false);
    }
  };

  const feeOverdue = Boolean(feeStatus?.overdue);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight text-left">Subscription Plans</h3>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Buy a lead pack to keep receiving new service requests. Your provider level discount is applied automatically.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5" />
              {showHistory ? 'Hide Invoices' : 'Purchase History'}
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-2xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {subscription && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Current Subscription</p>
              <div className="flex items-center gap-3 flex-wrap">
                <h4 className="text-xl font-extrabold">
                  Level {activePlanLevel} {subscription.plan?.name ? `· ${subscription.plan.name}` : ''}
                </h4>
                <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full border ${SECTOR_STYLES[subscription.sector] || 'bg-slate-700 border-slate-600 text-slate-200'}`}>
                  {subscription.sector} Sector
                </span>
                {hasActivePlan ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase rounded-full border bg-emerald-500/20 border-emerald-400/40 text-emerald-300 px-2.5 py-1">
                    <Zap className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase rounded-full border bg-amber-500/20 border-amber-400/40 text-amber-300 px-2.5 py-1">
                    <AlertTriangle className="w-3 h-3" /> Inactive
                  </span>
                )}
                <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-full border bg-white/5 border-white/10 text-slate-300">
                  {subscription.status ?? 'ACTIVE'} · Payment {subscription.paymentStatus ?? 'PENDING'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <p className="text-2xl font-black">{subscription.remainingLeads ?? 0}</p>
                <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Leads Left</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <p className="text-2xl font-black">{subscription.completedJobsCurrentSubscription ?? 0}</p>
                <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Jobs Done</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <p className="text-2xl font-black">{levelDiscount}%</p>
                <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Level Discount</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {feeStatus && (
        <div className={`bg-white border rounded-3xl p-5 ${feeOverdue ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'}`}>
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-teal-600" /> Monthly Platform Fee
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <h4 className="text-lg font-extrabold text-slate-900">{fmtMoney(feeStatus.amount)} <span className="text-xs font-bold text-slate-400">/ month</span></h4>
                {feeOverdue ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase rounded-full border bg-rose-50 text-rose-700 border-rose-200 px-2.5 py-1">
                    <AlertTriangle className="w-3 h-3" /> Overdue — leads paused
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 px-2.5 py-1">
                    <CheckCircle2 className="w-3 h-3" /> Up to date
                  </span>
                )}
                {!feeStatus.enabled && (
                  <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-full border bg-slate-100 text-slate-500 border-slate-200">
                    Currently disabled
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-semibold mt-1.5">
                {feeOverdue
                  ? `Payment due since ${fmtDate(feeStatus.dueAt)}. You will not receive new leads until it is paid.`
                  : feeStatus.dueAt
                    ? `Next payment due ${fmtDate(feeStatus.dueAt)}.`
                    : 'Keep this fee paid to keep receiving new service leads.'}
              </p>
            </div>
            {feeStatus.enabled && (
              <button
                onClick={handlePayFee}
                disabled={payingFee}
                className="shrink-0 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl px-5 py-2.5 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CreditCard className="w-3.5 h-3.5" />
                {payingFee ? 'Processing...' : `Pay ${fmtMoney(feeStatus.amount)}`}
              </button>
            )}
          </div>

          {feeHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Recent payments</p>
              <div className="flex flex-wrap gap-2">
                {feeHistory.slice(0, 3).map((p) => (
                  <span key={p.id} className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                    {fmtMoney(p.amount)} · {p.paymentStatus} · {fmtDate(p.paidAt || p.createdAt)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading && plans.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-400 text-xs font-semibold">
          Loading plans...
        </div>
      ) : visiblePlans.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-400 text-xs font-semibold">
          No plans are available right now. Check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visiblePlans.map((plan) => {
            const isCurrent = plan.level === activePlanLevel;
            const price = Number(plan.finalPrice ?? plan.price ?? 0);
            const discount = Number(plan.discountPercent ?? 0);
            return (
              <div
                key={plan.level}
                className={`relative bg-white border rounded-3xl p-6 flex flex-col transition-shadow hover:shadow-lg ${
                  isCurrent ? 'border-teal-400 ring-2 ring-teal-200' : 'border-slate-200'
                }`}
              >
                {plan.isFree && (
                  <span className="absolute -top-2.5 left-6 bg-teal-600 text-white text-[9px] font-black uppercase tracking-wider rounded-full px-3 py-1">
                    Free Lead
                  </span>
                )}
                {discount > 0 && !plan.isFree && (
                  <span className="absolute -top-2.5 right-6 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider rounded-full px-3 py-1 inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {discount}% off
                  </span>
                )}
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-extrabold text-slate-900">{plan.name}</h5>
                  <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full border ${SECTOR_STYLES[plan.sector] || 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                    {plan.sector}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">{fmtMoney(price)}</span>
                    {Number(plan.price) > price && (
                      <span className="text-xs font-bold text-slate-400 line-through">{fmtMoney(plan.price)}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">One-time payment · {plan.leadCount} lead{plan.leadCount !== 1 ? 's' : ''}</p>
                </div>

                <p className="text-xs text-slate-600 font-medium mb-5 flex-1 leading-relaxed">
                  {plan.description || `Unlock ${plan.leadCount} new service leads in the ${plan.sector} sector.`}
                </p>

                <div className="space-y-1.5 mb-5">
                  {[
                    `${plan.leadCount} service lead${plan.leadCount !== 1 ? 's' : ''}`,
                    plan.sector === 'PREMIUM' ? 'Premium sector requests' : 'General sector requests',
                    'Verified customer requests only',
                    'Unanswered requests are flagged for admin follow-up'
                  ].map((f) => (
                    <p key={f} className="text-[11px] font-semibold text-slate-600 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" /> {f}
                    </p>
                  ))}
                </div>

                {plan.isFree ? (
                  <div className="text-center text-[10px] font-black uppercase text-slate-400 bg-slate-50 border border-slate-200 rounded-xl py-2.5">
                    Granted automatically
                  </div>
                ) : isCurrent ? (
                  <div className="text-center text-[10px] font-black uppercase text-teal-700 bg-teal-50 border border-teal-200 rounded-xl py-2.5">
                    ✓ Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handlePurchase(plan)}
                    disabled={purchasing}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl py-2.5 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {purchasing ? 'Processing...' : `Buy for ${fmtMoney(price)}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showHistory && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-extrabold text-slate-900">Purchase History ({transactions.length})</span>
          </div>
          {transactions.length === 0 ? (
            <p className="text-slate-400 text-xs italic p-6 text-center">No purchases yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Invoice', 'Plan', 'Amount', 'Discount', 'Paid', 'Leads', 'Method', 'Payment', 'Date'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-slate-700">{tx.invoiceNumber || tx.id.slice(0, 12)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {tx.planName || (tx.plan?.name) || `Level ${tx.levelPurchased}`}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{fmtMoney(tx.price)}</td>
                      <td className="px-4 py-3 text-emerald-600 font-semibold">
                        {Number(tx.discountAmount) > 0 ? `-${fmtMoney(tx.discountAmount)}` : '—'}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">{fmtMoney(tx.finalAmount)}</td>
                      <td className="px-4 py-3 text-slate-600">{tx.leadCount}</td>
                      <td className="px-4 py-3 capitalize text-slate-600">{tx.paymentMethod || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full border ${
                          tx.paymentStatus === 'PAID'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : tx.paymentStatus === 'FAILED'
                              ? 'bg-rose-50 border-rose-200 text-rose-700'
                              : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}>
                          {tx.paymentStatus || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(tx.purchasedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-slate-400 font-semibold text-center">
        Signed in as {currentUser?.name || 'provider'} — your provider level and subscription are independent.
      </p>
    </div>
  );
}
