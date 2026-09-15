import React, { useEffect, useState } from 'react';
import { Users, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { api as apiClient } from '../../../utils/apiClient';
import { exportAllPages } from '../../../utils/exportExcel';

const STATUS_ORDER = ['PENDING', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED'];
const STATUS_META = {
  PENDING: { label: 'Pending', color: '#f59e0b' },
  CONFIRMED: { label: 'Confirmed', color: '#38bdf8' },
  ONGOING: { label: 'Ongoing', color: '#a78bfa' },
  COMPLETED: { label: 'Completed', color: '#34d399' },
  CANCELLED: { label: 'Cancelled', color: '#fb7185' }
};

const fmt = (value) => {
  if (value == null || value === '') return '';
  return new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const num = (value) => (value == null || value === '' ? '' : Number(value));

export default function AdminAnalyticsTab() {
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    let active = true;
    setAnalyticsLoading(true);
    apiClient.get('/admin/analytics?period=all').then((res) => {
      if (!active) return;
      setAnalytics(res.ok ? res.data : null);
      setAnalyticsLoading(false);
    }).catch(() => {
      if (active) {
        setAnalytics(null);
        setAnalyticsLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const statusCounts = STATUS_ORDER
    .map((status) => {
      const row = (analytics?.bookingsByStatus || []).find((r) => r.status === status);
      return { status, count: row?._count || 0, ...STATUS_META[status] };
    });
  const totalBookings = statusCounts.reduce((s, x) => s + x.count, 0);
  const userCounts = analytics?.userCounts || {};
  const customerCount = userCounts.customers ?? 0;
  const providerCount = userCounts.providers ?? 0;

  const handleExport = async () => {
    setExportError('');
    setExporting(true);
    try {
      await exportAllPages({
        fetchPage: async (page, limit) => {
          const res = await apiClient.get(`/admin/bookings?page=${page}&limit=${limit}`);
          const rows = (res.data?.bookings || []).map((b) => ({
            'Booking Number': b.bookingNumber || '',
            Status: b.status || '',
            Category: b.serviceCategory || b.service?.name || '',
            'Booking Date': fmt(b.bookingDate),
            'Total Amount': num(b.totalAmount),
            Amount: num(b.amount),
            'Customer Platform Charge': num(b.customerPlatformCharge),
            'Provider Platform Charge': num(b.providerPlatformCharge),
            'Provider Payout': num(b.providerPayout),
            'Customer Name': b.customer?.name || '',
            'Customer Phone': b.customer?.phone || '',
            'Customer Email': b.customer?.email || '',
            'Provider Name': b.provider?.user?.name || '',
            'Provider Phone': b.provider?.user?.phone || '',
            'Provider Email': b.provider?.user?.email || '',
            'Location Address': b.locationAddress || '',
            City: b.city || '',
            'Contact Phone': b.contactPhone || '',
            Instructions: b.instructions || '',
            Reviewed: b.reviewed ? 'Yes' : 'No',
            'Cancelled By': b.cancelledBy || '',
            'Cancelled Reason': b.cancelledReason || '',
            'Started At': fmt(b.startedAt),
            'Completed At': fmt(b.completedAt),
            'Created At': fmt(b.createdAt),
            'Updated At': fmt(b.updatedAt),
            'Quotation Service Fee': b.quotation ? num(b.quotation.serviceFee) : '',
            'Quotation Total': b.quotation ? num(b.quotation.totalAmount) : '',
            'Quotation Status': b.quotation?.status || '',
            Events: (b.events || []).map((e) => `${e.action}${e.actorRole ? ` (${e.actorRole})` : ''} at ${fmt(e.timestamp)}`).join('; ')
          }));
          return { rows, total: res.data?.pagination?.total || 0 };
        },
        fileName: 'all-bookings-report',
        sheetName: 'Bookings'
      });
    } catch (err) {
      console.error('Bookings export failed:', err);
      setExportError('Could not export bookings. Check your connection and try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Platform Analytics</h2>
        <p className="text-slate-500 text-xs">All-time overview of users and bookings.</p>
      </div>

      {/* Users — customers & providers in one box */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Users</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <div className="p-5 text-center">
            <p className="text-3xl font-black text-slate-900">{customerCount}</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest font-black text-slate-400">Customers</p>
          </div>
          <div className="p-5 text-center">
            <p className="text-3xl font-black text-slate-900">{providerCount}</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest font-black text-slate-400">Providers</p>
          </div>
        </div>
      </div>

      {/* Bookings by status + Excel export */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <span className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Bookings by Status</span>
          <button
            onClick={handleExport}
            disabled={exporting || totalBookings === 0}
            className="ml-auto flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black px-3.5 py-2 rounded-xl transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {exporting ? 'Exporting...' : 'Export Bookings'}
          </button>
        </div>

        {exportError && (
          <div className="mx-5 mt-4 flex items-center gap-2 text-xs font-bold rounded-2xl px-4 py-3 border bg-rose-50 border-rose-200 text-rose-700">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {exportError}
          </div>
        )}

        <div className="p-5">
          {analyticsLoading ? (
            <p className="text-slate-400 text-xs italic text-center py-8">Loading analytics...</p>
          ) : totalBookings === 0 ? (
            <p className="text-slate-400 text-xs italic text-center py-8">No bookings yet.</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <DonutChart segments={statusCounts} total={totalBookings} />
              <div className="w-full space-y-2.5">
                {statusCounts.map((s) => (
                  <div key={s.status} className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="w-24 text-xs font-bold text-slate-600 text-left shrink-0">{s.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-3 rounded-full"
                        style={{ width: `${Math.round((s.count / totalBookings) * 100)}%`, backgroundColor: s.color }}
                      />
                    </div>
                    <span className="w-8 text-xs font-black text-slate-800 text-right shrink-0">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DonutChart({ segments, total }) {
  const size = 180;
  const stroke = 26;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      {segments.filter((s) => s.count > 0).map((s) => {
        const len = (s.count / total) * circumference;
        const circle = (
          <circle
            key={s.status}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${len} ${circumference - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += len;
        return circle;
      })}
      <text
        x="50%"
        y="49%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-slate-900 text-xl font-black"
      >
        {total}
      </text>
      <text
        x="50%"
        y="63%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-slate-400 text-[9px] font-bold uppercase tracking-wide"
      >
        Bookings
      </text>
    </svg>
  );
}