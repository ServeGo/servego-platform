import React, { useState } from 'react';
import { Plus, Trash2, IndianRupee, Send, XCircle, FileText } from 'lucide-react';
import { api } from '../utils/apiClient';
import { getErrorInfo } from '../utils/errorMessages';

// The customer's fixed service fee row. The authoritative value returns in the
// submitted quotation from the backend (AdminConfig `serviceFeeDefault`); the
// UI keeps its own constant so the composer can render a live total.
export const SERVICE_FEE_DEFAULT = 199;

const fmtMoney = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—';
};

export default function QuotationModal({ booking, existingQuotation, onClose, onSubmitted }) {
  const [rows, setRows] = useState(() =>
    (Array.isArray(existingQuotation?.items) && existingQuotation.items.length
      ? existingQuotation.items
      : [{ purpose: '', amount: '' }]
    ).map((row) => ({ purpose: String(row.purpose || ''), amount: row.amount ?? '' }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const sum = rows.reduce((total, row) => total + (Math.max(0, Number(row.amount)) || 0), 0);
  const fee = Number(existingQuotation?.serviceFee ?? SERVICE_FEE_DEFAULT) || SERVICE_FEE_DEFAULT;
  const total = fee + sum;

  const updateRow = (idx, patch) => {
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const removeRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));
  const addRow = () => setRows((prev) => [...prev, { purpose: '', amount: '' }]);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    const items = rows
      .filter((row) => String(row.purpose || '').trim() && (Number(row.amount) || 0) > 0)
      .map((row) => ({ purpose: String(row.purpose).trim(), amount: Math.round(Number(row.amount)) }));
    if (total <= 0 && items.length === 0) {
      setError('Add at least one payable line item to the quotation.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/bookings/${booking.id}/quotation`, { items });
      if (res.ok && res.data?.quotation) {
        onSubmitted(res.data, booking);
        return;
      }
      setError(getErrorInfo(res.data, 'Could not submit the quotation.').message);
    } catch (err) {
      setError(getErrorInfo(err, 'Could not submit the quotation.').message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-2xl w-full relative shadow-2xl animate-fade-in mt-6 mb-6 text-left max-h-[calc(100vh-4rem)] overflow-y-auto hide-scrollbar">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Submit Quotation</h3>
            <p className="text-slate-500 text-xs font-medium">
              {booking.serviceCategory} · {effectiveAddress(booking)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
          >
            Exit
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2 font-semibold">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <div className="text-xs text-slate-500 font-semibold bg-slate-50 border border-slate-200 rounded-xl p-3">
            The customer receives your quotation instantly in the app. Once they confirm it, the job starts.
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-3">
              <span className="text-xs font-black uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4" /> Work Breakdown
              </span>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1 text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line Item
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              <QuoteRow purpose="ServeGo Service Fee" amount={fee} fixed feeLocked />
              {rows.map((row, idx) => (
                <QuoteRow
                  key={idx}
                  purpose={row.purpose}
                  amount={row.amount}
                  onChange={(patch) => updateRow(idx, patch)}
                  onRemove={(rows.length === 1 ? null : () => removeRow(idx))}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between bg-teal-50 border-2 border-teal-200 rounded-xl px-4 py-3">
            <span className="text-xs font-black uppercase tracking-wide text-teal-800">Estimated Total</span>
            <span className="text-2xl font-black text-teal-800 flex items-center gap-1">
              <IndianRupee className="w-5 h-5" /> {total.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl text-xs font-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Processing…' : existingQuotation?.id ? 'Update Quotation' : 'Send Quotation to Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function effectiveAddress(booking) {
  return [booking.locationAddress, booking.city].filter(Boolean).join(', ') || 'Address on booking';
}

function QuoteRow({ purpose, amount, fixed, feeLocked, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 px-4 py-3">
      <div className="flex-1">
        {fixed ? (
          <span className="block text-xs font-black text-slate-800 uppercase tracking-wide">{purpose}</span>
        ) : (
          <input
            value={purpose}
            onChange={(e) => onChange({ purpose: e.target.value })}
            placeholder="What is this charge for?"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-teal-400"
          />
        )}
      </div>
      <div className="w-32 sm:w-40 shrink-0">
        {fixed ? (
          <span className="block text-right text-sm font-black text-teal-700 text-right pr-1">₹{amount}</span>
        ) : (
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => onChange({ amount: e.target.value })}
            placeholder="Amount"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 text-right outline-none focus:border-teal-400"
          />
        )}
      </div>
      {!feeLocked && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          title="Remove line item"
          className="shrink-0 p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
      {!feeLocked && !onRemove && <span className="shrink-0 w-8" />}
    </div>
  );
}