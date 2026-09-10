import React, { useState } from 'react';
import { Plus, Trash2, IndianRupee, Send, XCircle, FileText, Pencil } from 'lucide-react';
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
  const [step, setStep] = useState('form');
  const [error, setError] = useState('');

  const sum = rows.reduce((total, row) => total + (Math.max(0, Number(row.amount)) || 0), 0);
  const fee = Number(existingQuotation?.serviceFee ?? SERVICE_FEE_DEFAULT) || SERVICE_FEE_DEFAULT;
  const total = fee + sum;

  const updateRow = (idx, patch) => {
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const removeRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));
  const addRow = () => setRows((prev) => [...prev, { purpose: '', amount: '' }]);

  const itemRows = rows
    .filter((row) => String(row.purpose || '').trim() && (Number(row.amount) || 0) > 0)
    .map((row) => ({ purpose: String(row.purpose).trim(), amount: Math.round(Number(row.amount)) }));

  const goPreview = () => {
    setError('');
    if (itemRows.length === 0) {
      setError('Add at least one payable line item alongside the service fee.');
      return;
    }
    setStep('preview');
  };

  const submit = async () => {
    if (submitting) return;
    setError('');
    if (itemRows.length === 0) {
      setError('Add at least one payable line item alongside the service fee.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/bookings/${booking.id}/quotation`, { items: itemRows });
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 max-w-xl w-full relative shadow-2xl animate-fade-in m-auto text-left max-h-[calc(100vh-2rem)] overflow-y-auto hide-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {step === 'preview' ? 'Preview Quotation' : 'Submit Quotation'}
            </h3>
            {booking.serviceCategory && (
              <p className="text-slate-400 text-[11px] font-semibold mt-0.5">{booking.serviceCategory}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
          >
            Exit
          </button>
        </div>

        {error && (
          <div className="mb-3 bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl text-xs flex items-center gap-2 font-semibold">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 'form' ? (
          <form onSubmit={(e) => { e.preventDefault(); goPreview(); }} className="space-y-3">
            <div className="text-[11px] text-slate-500 font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              The customer receives your quotation instantly. Once they confirm it, the job starts.
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between bg-slate-900 text-white px-3 py-2">
                <span className="text-[11px] font-black uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Work Breakdown
                </span>
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-1 text-[11px] font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 px-2.5 py-1 rounded-lg transition-colors"
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

            <div className="flex items-center justify-between bg-teal-50 border-2 border-teal-200 rounded-xl px-3 py-2.5">
              <span className="text-[11px] font-black uppercase tracking-wide text-teal-800">Estimated Total</span>
              <span className="text-lg font-black text-teal-800 flex items-center gap-1">
                <IndianRupee className="w-4 h-4" /> {total.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl text-xs font-black transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> Preview Quotation
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="text-[11px] text-slate-500 font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              Review your quotation before sending it to the customer.
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between bg-slate-900 text-white px-3 py-2">
                <span className="text-[11px] font-black uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Preview Breakdown
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                <PreviewRow purpose="ServeGo Service Fee" amount={fee} fixed />
                {itemRows.map((row, idx) => (
                  <PreviewRow key={idx} purpose={row.purpose} amount={row.amount} />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between bg-teal-50 border-2 border-teal-200 rounded-xl px-3 py-2.5">
              <span className="text-[11px] font-black uppercase tracking-wide text-teal-800">Estimated Total</span>
              <span className="text-lg font-black text-teal-800 flex items-center gap-1">
                <IndianRupee className="w-4 h-4" /> {total.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep('form')}
                className="inline-flex items-center gap-1.5 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Quotation
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={submit}
                className="inline-flex items-center gap-1.5 h-9 bg-teal-600 hover:bg-teal-700 text-white px-6 rounded-xl text-xs font-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Processing…' : existingQuotation?.id ? 'Update Quotation' : 'Send Quotation to Customer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewRow({ purpose, amount, fixed }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2">
      <span className={`min-w-0 flex-1 ${fixed ? 'text-[11px] font-black text-slate-800 uppercase tracking-wide' : 'text-xs font-semibold text-slate-700'}`}>
        {purpose}
      </span>
      <span className={`shrink-0 ${fixed ? 'text-xs font-black text-teal-700' : 'text-xs font-bold text-slate-800'}`}>
        {fmtMoney(amount)}
      </span>
    </div>
  );
}

function QuoteRow({ purpose, amount, fixed, feeLocked, onChange, onRemove }) {
  return (
    <div className="flex items-end gap-2 px-3 py-2">
      <div className="flex-[4] min-w-0">
        {fixed ? (
          <span className="block leading-7 text-[11px] font-black text-slate-800 uppercase tracking-wide">{purpose}</span>
        ) : (
          <label className="block">
            <span className="block text-[10px] font-bold text-slate-500 mb-0.5">Work description</span>
            <input
              value={purpose}
              onChange={(e) => onChange({ purpose: e.target.value })}
              placeholder="What is this charge for?"
              className="w-full h-7 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-teal-400"
            />
          </label>
        )}
      </div>
      <div className="w-20 shrink-0">
        {fixed ? (
          <span className="block leading-7 text-xs font-black text-teal-700 text-right pr-1">₹{amount}</span>
        ) : (
          <label className="block">
            <span className="block text-[10px] font-bold text-slate-500 mb-0.5 text-right">Amount</span>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => onChange({ amount: e.target.value })}
              placeholder="₹"
              className="w-full h-7 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs font-bold text-slate-800 text-right outline-none focus:border-teal-400"
            />
          </label>
        )}
      </div>
      {!feeLocked && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          title="Remove line item"
          className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
      {!feeLocked && !onRemove && <span className="shrink-0 w-7 h-7" />}
    </div>
  );
}