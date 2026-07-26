import React, { useMemo, useState } from 'react';
import { Download, TrendingUp, Search } from 'lucide-react';

function formatMoney(n) {
  const num = Number(n) || 0;
  return `₹${num.toLocaleString()}`;
}

function safeDateToLabel(d) {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toISOString().slice(0, 10);
}

function toCsv(rows) {
  const headers = [
    'Job Code',
    'Invoice',
    'Date',
    'Client',
    'Gross Revenue',
    'Service Fee',
    'Tax',
    'Net Payout'
  ];

  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.invoiceNumber || '',
        safeDateToLabel(r.createdAt || r.bookingDate),
        r.customerName || '',
        r.totalAmount,
        r.serviceFee,
        r.tax,
        (Number(r.totalAmount) - Number(r.serviceFee) - Number(r.tax))
      ].map(escape).join(',')
    );
  }
  return lines.join('\n');
}

function downloadTextFile(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function EarningsChart({ completedJobs }) {
  const [timeRange, setTimeRange] = useState('30d'); // 7d | 30d | 90d | all
  const [query, setQuery] = useState('');

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();

    const rangeMs =
      timeRange === '7d' ? 7 * 24 * 60 * 60 * 1000 :
      timeRange === '30d' ? 30 * 24 * 60 * 60 * 1000 :
      timeRange === '90d' ? 90 * 24 * 60 * 60 * 1000 :
      null;

    return completedJobs
      .filter(j => {
        if (!rangeMs) return true;
        const dt = j.createdAt ? new Date(j.createdAt) : (j.bookingDate ? new Date(j.bookingDate) : null);
        if (!dt || Number.isNaN(dt.getTime())) return false;
        return now - dt.getTime() <= rangeMs;
      })
      .filter(j => {
        if (!q) return true;
        const hay = [
          j.id,
          j.invoiceNumber,
          j.customerName,
          j.serviceCategory,
          j.city,
          j.locationAddress,
          safeDateToLabel(j.createdAt || j.bookingDate)
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .slice()
      .sort((a, b) => {
        const da = (a.createdAt || a.bookingDate) ? new Date(a.createdAt || a.bookingDate).getTime() : 0;
        const db = (b.createdAt || b.bookingDate) ? new Date(b.createdAt || b.bookingDate).getTime() : 0;
        return db - da;
      });
  }, [completedJobs, timeRange, query]);

  const totals = useMemo(() => {
    const gross = filteredJobs.reduce((s, j) => s + Number(j.totalAmount || 0), 0);
    const fees = filteredJobs.reduce((s, j) => s + Number(j.serviceFee || 0), 0);
    const tax = filteredJobs.reduce((s, j) => s + Number(j.tax || 0), 0);
    const net = gross - fees - tax;
    const avgPayout = filteredJobs.length ? net / filteredJobs.length : 0;

    return { gross, fees, tax, net, avgPayout };
  }, [filteredJobs]);

  const weeklyData = useMemo(() => {
    // simple buckets for visual index: take last 7 days (from now) and sum gross
    const now = Date.now();
    const buckets = Array.from({ length: 7 }, () => 0);

    for (const j of completedJobs) {
      const dt = j.createdAt ? new Date(j.createdAt) : (j.bookingDate ? new Date(j.bookingDate) : null);
      if (!dt || Number.isNaN(dt.getTime())) continue;
      const diffDays = Math.floor((now - dt.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays < 0 || diffDays > 6) continue;
      const idx = 6 - diffDays;
      buckets[idx] += Number(j.totalAmount || 0);
    }

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return buckets.map((amount, i) => ({ day: labels[i], amount }));
  }, [completedJobs]);

  const maxAmount = Math.max(1, ...weeklyData.map(d => d.amount));
  const netPending = totals.net;

  const handleDownloadCsv = () => {
    const csv = toCsv(filteredJobs);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`earnings-statement-${stamp}.csv`, csv, 'text/csv');
  };

  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Earnings Performance</h4>
              <p className="text-xs text-slate-500 font-semibold mt-1">Filter by time range to view partner payouts (completed jobs only).</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex gap-2 bg-slate-50 border border-slate-200 p-1 rounded-2xl">
                {[
                  { id: '7d', label: '7D' },
                  { id: '30d', label: '30D' },
                  { id: '90d', label: '90D' },
                  { id: 'all', label: 'All' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTimeRange(t.id)}
                    className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${
                      timeRange === t.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search job / invoice / client..."
                    className="w-56 sm:w-72 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="h-64 flex flex-col justify-between pt-6">
            <div className="flex-grow flex items-end justify-between gap-4 px-2 pb-2 border-b border-slate-200 max-h-[170px]">
              {weeklyData.map((d, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-30">
                    {formatMoney(d.amount)}
                  </div>
                  <div
                    className="w-full bg-indigo-600 hover:bg-slate-900 rounded-t-lg transition-all duration-300"
                    style={{ height: `${(Number(d.amount) / maxAmount) * 100}%` }}
                  />
                  <span className="text-[10px] text-slate-500 font-extrabold mt-2 uppercase">{d.day}</span>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between items-center font-bold">
              <span>⚡ Escrow settlement cycle (estimated)</span>
              <span className="flex items-center gap-1 text-emerald-600"><TrendingUp className="w-4 h-4" /> Growth active</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-4 bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 space-y-6">
          <h4 className="text-base font-bold tracking-tight">Escrow Wallet</h4>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left">
            <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest block">Net Payout (filtered)</span>
            <span className="text-3xl font-black text-indigo-400 block mt-2">{formatMoney(netPending)}</span>
            <span className="text-[10px] text-slate-400 block mt-1 font-medium">{filteredJobs.length} completed jobs</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase">Avg payout</span>
              <div className="text-sm font-black text-emerald-300 mt-1">{formatMoney(totals.avgPayout)}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase">Statement</span>
              <button
                onClick={handleDownloadCsv}
                className="mt-1 inline-flex items-center gap-2 text-[11px] font-black text-indigo-200 hover:text-indigo-100 transition"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>
          <div className="text-xs text-slate-400 leading-relaxed font-semibold italic opacity-80">
            ⓘ Calculated from completed bookings: gross revenue − service fee − tax.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Gross revenue" value={formatMoney(totals.gross)} color="bg-indigo-50 border-indigo-200 text-indigo-900" />
        <StatCard label="Service fee" value={formatMoney(totals.fees)} color="bg-amber-50 border-amber-200 text-amber-900" />
        <StatCard label="Tax" value={formatMoney(totals.tax)} color="bg-slate-50 border-slate-200 text-slate-900" />
        <StatCard label="Net payout" value={formatMoney(totals.net)} color="bg-emerald-50 border-emerald-200 text-emerald-900" />
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mb-4">
          <h4 className="font-extrabold text-slate-800 text-sm">Completed Payments Log</h4>
          <div className="text-xs text-slate-500 font-semibold">
            Showing <span className="text-slate-900">{filteredJobs.length}</span> transactions
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No job transactions match the current filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-bold">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5">Job Code</th>
                  <th className="py-2.5">Invoice</th>
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Client</th>
                  <th className="py-2.5 text-right">Net Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredJobs.map(j => {
                  const net = Number(j.totalAmount || 0) - Number(j.serviceFee || 0) - Number(j.tax || 0);
                  return (
                    <tr key={j.id}>
                      <td className="py-3 font-mono text-slate-900">{j.id}</td>
                      <td className="py-3 font-medium">{j.invoiceNumber || '-'}</td>
                      <td className="py-3 font-medium">{safeDateToLabel(j.createdAt || j.bookingDate)}</td>
                      <td className="py-3 font-medium">{j.customerName || '-'}</td>
                      <td className="py-3 text-right text-emerald-600 font-black">{formatMoney(net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-3xl border ${color} p-4`}>
      <div className="text-[10px] font-extrabold uppercase tracking-widest">{label}</div>
      <div className="mt-2 text-sm sm:text-base font-black">{value}</div>
    </div>
  );
}

