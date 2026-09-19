import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Receipt, RefreshCw, ShoppingBag, Wallet } from 'lucide-react';
import { api } from '../utils/apiClient';
import { cachedRequest } from '../utils/requestCache';
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

// Customer wallet is a spend showcase only — every entry shown is money the
// customer paid (directly to the specialist or as a cancellation service fee).
const CATEGORY_META = {
  BOOKING_PAYMENT: { label: 'Service payment', icon: Receipt, tone: 'bg-indigo-50 text-indigo-600' },
  SERVICE_FEE: { label: 'Cancellation fee', icon: Receipt, tone: 'bg-rose-50 text-rose-500' }
};
const GENERIC_META = { label: 'Spending', icon: Receipt, tone: 'bg-slate-100 text-slate-600' };

/**
 * Customer money view — a SPEND SHOWCASE only. No account, no balance gate, no
 * loyalty tiers, no incentives: just the total spent on services (completed job
 * amounts paid directly to providers + cancellation service fees), a
 * per-service breakdown, and the spending ledger. Credits and anything else are
 * intentionally not shown to the customer.
 */
export default function WalletView({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // Historical spends — safe to read from the shared ledger cache (stays
    // fresh within 30s; provider-side ambassador list uses the same rows).
    const l = await cachedRequest('wallet-ledger', () => api.get('/wallet/ledger'));
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

      {/* SPENDING LEDGER: every entry shown is a payment the customer made */}
      <SectionCard
        title="Spending History"
        right={
          <button onClick={load} className="text-[10px] font-black text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        }
      >
        {spendRows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Nothing spent yet"
            body="Complete a job or cancel a quotation to see your spending here."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {spendRows.map((t) => {
              const meta = CATEGORY_META[t.category] || GENERIC_META;
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
                  <div className="text-sm font-black whitespace-nowrap text-rose-500">
                    −{fmtMoney(t.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
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