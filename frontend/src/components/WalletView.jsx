import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Copy,
  Crown,
  Gift,
  Layers,
  Receipt,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wallet,
} from 'lucide-react';
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

const SPEND_CATEGORIES = new Set(['BOOKING_PAYMENT', 'SERVICE_FEE']);

const CATEGORY_META = {
  BOOKING_PAYMENT: { label: 'Service payment', icon: Receipt, tone: 'bg-indigo-50 text-indigo-600' },
  SERVICE_FEE: { label: 'Service fee', icon: Receipt, tone: 'bg-rose-50 text-rose-500' },
  REFERRAL_BONUS: { label: 'Referral bonus', icon: Gift, tone: 'bg-indigo-50 text-indigo-600' },
  PROMOTIONAL_CREDIT: { label: 'Promotional credit', icon: Sparkles, tone: 'bg-amber-50 text-amber-600' },
  BOOKING_REFUND: { label: 'Booking refund', icon: ShieldCheck, tone: 'bg-sky-50 text-sky-600' },
  DISPUTE_REFUND: { label: 'Dispute refund', icon: ShieldCheck, tone: 'bg-teal-50 text-teal-600' },
  ADJUSTMENT: { label: 'Adjustment', icon: Sparkles, tone: 'bg-slate-100 text-slate-600' },
  BOOKING_EARNING: { label: 'Credit', icon: ArrowDownLeft, tone: 'bg-emerald-50 text-emerald-600' },
  WITHDRAWAL: { label: 'Debit', icon: ArrowUpRight, tone: 'bg-rose-50 text-rose-500' }
};

/**
 * Customer money view — a SPEND SHOWCASE, not a gated account.
 *
 * Top card = total spent on services (completed job amounts paid directly to
 * providers + cancellation service fees), per-service breakdown, then the full
 * ledger. Referrals, gift codes and loyalty progression stay as separate cards.
 */
export default function WalletView({
  user,
  loyaltyTier,
  completedCount,
  bookingsNeeded,
  progressPercent,
  nextTierName,
  referralCode,
  referralInput,
  setReferralInput,
  onApplyCode,
  onCopyCode,
  copied,
  refError,
  refSuccess
}) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const l = await api.get('/wallet/ledger');
    if (l.ok) setTransactions(l.data?.transactions || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const spendRows = transactions.filter((t) => t.type === 'DEBIT' && SPEND_CATEGORIES.has(t.category));
  const totalSpent = spendRows.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const feesPaid = spendRows.filter((t) => t.category === 'SERVICE_FEE').length;
  const servicesUsed = new Set(spendRows.map((t) => t.service || CATEGORY_META[t.category]?.label || 'Other')).size;

  const byService = Array.from(
    spendRows.reduce((map, t) => {
      const key = t.service || CATEGORY_META[t.category]?.label || 'Other';
      const cur = map.get(key) || { service: key, amount: 0, count: 0 };
      cur.amount += Number(t.amount) || 0;
      cur.count += 1;
      map.set(key, cur);
      return map;
    }, new Map()).values()
  ).sort((a, b) => b.amount - a.amount);

  if (loading) {
    return <SkeletonLoader type="text" count={4} />;
  }

  return (
    <div className="space-y-5 sm:space-y-6 text-left">
      {/* SPEND: total spent on services (display-only showcase) */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white">
        <div className="absolute -top-14 -right-14 w-52 h-52 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-indigo-600/25 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-widest">
              <Wallet className="w-4 h-4 text-teal-400" />
              Total Spent on Services
            </div>
            <span className="shrink-0 rounded-full bg-white/10 border border-white/15 text-teal-300 text-[10px] font-black uppercase px-3 py-1">
              Money Spent
            </span>
          </div>
          <div className="mt-3 text-4xl sm:text-5xl font-black tracking-tight">{fmtMoney(totalSpent)}</div>
          <p className="text-slate-400 text-[11px] font-semibold mt-2 max-w-md leading-relaxed">
            Everything you've paid for completed jobs (directly to the specialist) and cancellation service fees.
          </p>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-7">
            <HeroStat label="Services" value={servicesUsed} />
            <HeroStat label="Cancellation Fees" value={feesPaid} />
            <HeroStat label="Entries" value={spendRows.length} />
          </div>
        </div>
      </section>

      {/* SPEND BY SERVICE */}
      <SectionCard
        title="Spent by Service"
        right={byService.length > 0 ? <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total {fmtMoney(totalSpent)}</span> : null}
      >
        {byService.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Nothing spent yet"
            body="Complete your first job or cancel a quotation to see your spend here."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {byService.map((s) => (
              <div key={s.service} className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-800 truncate">{s.service}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{s.count} {s.count === 1 ? 'entry' : 'entries'}</p>
                </div>
                <div className="text-sm font-black whitespace-nowrap text-slate-900">{fmtMoney(s.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* REFERRALS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">Your Ambassador Credentials</h3>
            <p className="text-slate-500 text-xs mt-3 leading-relaxed font-semibold">
              Gift ₹150 off to friends. Once they complete a booking, you get ₹150 credited to your wallet.
            </p>
          </div>

          <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block mb-2">My Referral Code</span>
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-center">
              <div className="flex-1 bg-indigo-50 border border-dashed border-indigo-200 rounded-xl px-4 py-3 font-mono font-extrabold text-lg text-indigo-700 tracking-wider text-center sm:text-left truncate">
                {referralCode}
              </div>
              <button
                onClick={onCopyCode}
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-xs font-bold text-white px-5 rounded-xl py-3 transition-all flex items-center justify-center gap-1.5 outline-none"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <WalletStat label="Wallet Balance" value={`₹${Number(user?.referralDiscountBalance || 0).toLocaleString('en-IN')}`} />
            <WalletStat label="Successful Referrals" value={`${user?.referralsCount || 0}`} />
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">Claim Gift Code</h3>
            <p className="text-slate-500 text-xs mt-3 leading-relaxed font-semibold">
              Redeem a friend's code to get ₹150 credit.
            </p>
          </div>

          <form onSubmit={onApplyCode} className="mt-6 space-y-3">
            <input
              type="text"
              placeholder="Enter friend's code..."
              value={referralInput}
              onChange={(e) => setReferralInput(e.target.value)}
              disabled={!!user?.referredBy}
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white text-xs font-bold font-mono px-4 py-3 rounded-xl outline-none disabled:opacity-60"
            />
            {refError && (
              <div className="text-[10px] text-rose-700 font-bold bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
                {refError}
              </div>
            )}
            {refSuccess && (
              <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg">
                {refSuccess}
              </div>
            )}

            {user?.referredBy ? (
              <div className="text-[10px] text-slate-500 font-bold text-center bg-slate-100 rounded-xl p-3">
                Applied: <span className="text-teal-600 font-mono">{user.referredBy}</span>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-500 active:scale-[0.98] text-white text-xs font-bold p-3 rounded-xl shadow-sm transition-all"
              >
                Claim Credit
              </button>
            )}
          </form>
        </div>
      </div>

      {/* MONEY MOVEMENT: full ledger */}
      <SectionCard
        title="Transaction History"
        right={
          <button onClick={load} className="text-[10px] font-black text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        }
      >
        {transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No transactions yet"
            body="Complete a job or get a referral bonus to see entries here."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((t) => {
              const meta = CATEGORY_META[t.category] || CATEGORY_META[t.type === 'DEBIT' ? 'WITHDRAWAL' : 'BOOKING_EARNING'];
              const Icon = meta.icon;
              const title = t.service || meta.label;
              const detail = [fmtDate(t.createdAt), t.description && `· ${t.description}`].filter(Boolean).join(' ');
              return (
                <div key={t.id} className="flex items-center gap-3 p-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.tone}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-slate-800 truncate">{title}</p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate">{detail}</p>
                  </div>
                  <div className={`text-sm font-black whitespace-nowrap ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {t.type === 'CREDIT' ? '+' : '−'}{fmtMoney(t.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* LOYALTY */}
      {loyaltyTier && (
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 to-indigo-950 text-white rounded-3xl border border-white/5 shadow-xs">
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-amber-500/15 blur-3xl" />
          <div className="relative z-10 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <span className="text-[10px] text-teal-300 font-extrabold uppercase tracking-widest">
                Partnership Status
              </span>
              <span className="shrink-0 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase px-3 py-1 tracking-wider">
                Resident Loyalty
              </span>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <Crown className="w-6 h-6 text-amber-400" />
              <h3 className="text-3xl font-extrabold tracking-tight">{loyaltyTier.tier}</h3>
            </div>
            <p className="text-slate-300 text-xs mt-3 max-w-xl font-medium leading-relaxed">
              {loyaltyTier.desc}. Complete more jobs to level up automatically.
            </p>

            {nextTierName && (
              <div className="mt-6 pt-4 border-t border-white/10 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-extrabold text-slate-300 mb-2">
                  <span>Next Tier: {nextTierName}</span>
                  <span className="text-white">{completedCount} / {completedCount + bookingsNeeded} Jobs</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-indigo-400 h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, progressPercent)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-medium">
                  Complete <span className="text-amber-400 font-bold">{bookingsNeeded} more jobs</span> to unlock higher savings.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, right, children }) {
  return (
    <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <span className="text-sm font-extrabold text-slate-900 tracking-tight">{title}</span>
        {right}
      </div>
      {children}
    </section>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="bg-white/10 border border-white/10 rounded-2xl p-3 sm:p-4">
      <span className="text-[9px] sm:text-[10px] text-slate-300 font-black uppercase block leading-tight">{label}</span>
      <span className="text-lg sm:text-xl font-black mt-1 block">{value}</span>
    </div>
  );
}

function WalletStat({ label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
      <span className="text-[10px] text-slate-400 font-bold uppercase block">{label}</span>
      <span className="text-2xl font-black text-slate-900 mt-2 block">{value}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-xs font-extrabold text-slate-700 mt-3">{title}</p>
      <p className="text-[11px] text-slate-400 font-medium mt-1 max-w-[260px] leading-relaxed">{body}</p>
    </div>
  );
}