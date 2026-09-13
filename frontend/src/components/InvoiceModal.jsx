import React, { useEffect, useState } from 'react';
import { Download, X, Star } from 'lucide-react';
import Logo from './Logo';
import { api } from '../utils/apiClient';
import { API_BASE_URL } from '../utils/apiClient';

export default function InvoiceModal({ booking, onClose }) {
  const [review, setReview] = useState(null);
  const issuedLabel = booking.bookingDateLabel || booking.createdAt;
  const quotation = booking.quotation;
  const items = Array.isArray(quotation?.items) ? quotation.items : [];

  useEffect(() => {
    if (!booking.reviewed || !booking.id) return;
    const fetchReview = async () => {
      try {
        const res = await api.get(`${API_BASE_URL}/bookings/${booking.id}/review`);
        if (res.ok && res.data) {
          setReview(res.data.review || res.data);
        }
      } catch {
        // silently ignore — receipt still renders without review
      }
    };
    fetchReview();
  }, [booking.id, booking.reviewed]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 receipt-modal">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-[80dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden text-slate-800 text-left">

        {/* Header */}
        <div className="shrink-0 px-4 pt-3 pb-2.5 border-b border-slate-100 flex items-center justify-between gap-3 print-hidden">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900 tracking-tight">Payment Receipt</h3>
            <span className="text-[10px] text-slate-400 font-mono font-semibold block mt-0.5 break-all">#{booking.id}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg shrink-0"
            aria-label="Close receipt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable receipt body */}
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4 receipt-printable">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-5 sm:px-6">

            {/* Brand */}
            <div className="text-center border-b-2 border-dashed border-slate-200 pb-3">
              <Logo className="w-10 h-10 mx-auto rounded-xl shadow-sm" />
              <h4 className="text-base font-black text-slate-900 tracking-tight mt-1.5">servego24</h4>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest block">
                Service Receipt
              </span>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-4 py-3 text-xs">
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Receipt No.</span>
                <span className="text-slate-800 font-bold break-all">{booking.id}</span>
              </div>
              <div className="min-w-0 text-right">
                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Date Issued</span>
                <span className="text-slate-800 font-bold break-words">{issuedLabel}</span>
              </div>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold bg-slate-50 rounded-xl p-3">
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Customer</span>
                <span className="text-slate-900 font-bold block break-words">{booking.customerName}</span>
                <span className="text-slate-500 font-normal leading-relaxed block mt-0.5 break-words">{booking.locationAddress}</span>
                <span className="text-slate-500 font-normal block break-all">{booking.customerEmail}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Specialist</span>
                <span className="text-slate-900 font-bold block break-words">{booking.providerName}</span>
                <span className="text-slate-500 font-normal block mt-0.5">Category: {booking.serviceCategory}</span>
              </div>
            </div>

            {/* Quotation Line Items */}
            {items.length > 0 && (
              <div className="mt-3">
                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1.5">Quotation Items</span>
                <table className="w-full text-xs font-semibold text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                      <th className="py-1.5">Item</th>
                      <th className="py-1.5 text-right">Qty</th>
                      <th className="py-1.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b border-dashed border-slate-100">
                        <td className="py-1.5 text-slate-800">{item.name || item.description || `Item ${idx + 1}`}</td>
                        <td className="py-1.5 text-right text-slate-600">{item.quantity || 1}</td>
                        <td className="py-1.5 text-right text-slate-900 font-bold">
                          {item.amount != null ? `₹${Number(item.amount).toFixed(0)}` : '—'}
                        </td>
                      </tr>
                    ))}
                    {quotation?.serviceFee > 0 && (
                      <tr className="border-b border-dashed border-slate-100">
                        <td className="py-1.5 text-slate-600" colSpan={2}>Service Fee</td>
                        <td className="py-1.5 text-right text-slate-900 font-bold">₹{Number(quotation.serviceFee).toFixed(0)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {quotation?.totalAmount != null && (
                  <div className="flex justify-between items-center mt-1.5 text-xs">
                    <span className="font-bold text-slate-900">Total</span>
                    <span className="font-extrabold text-indigo-600">₹{Number(quotation.totalAmount).toFixed(0)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Service Line */}
            <table className="w-full text-xs font-semibold text-left mt-3">
              <thead>
                <tr className="border-b border-slate-200 text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                  <th className="py-1.5">Service</th>
                  <th className="py-1.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-dashed border-slate-200">
                  <td className="py-2 break-words">
                    <span className="font-bold text-slate-900 block break-words">{booking.serviceCategory} Service</span>
                    <span className="text-[10px] text-slate-500">Completed on {issuedLabel}</span>
                  </td>
                  <td className="py-2 text-right align-top">
                    <span className="inline-block text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] uppercase font-bold">
                      Completed
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Settlement */}
            <div className="mt-3 flex flex-wrap justify-between items-center gap-3 text-xs border-t border-dashed border-slate-200 pt-3">
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
                Service Completed
              </span>
              <div className="text-right">
                <span className="text-slate-400 text-[9px] uppercase block font-bold">Settlement</span>
                <span className="text-sm font-extrabold text-indigo-600 block leading-none">Direct with specialist</span>
              </div>
            </div>

            {/* Customer Review */}
            {review && (
              <div className="mt-4 border-t border-slate-200 pt-3">
                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1.5">Your Review</span>
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${s <= (review.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                    />
                  ))}
                  <span className="text-[10px] text-slate-500 font-bold ml-1">{review.rating}/5</span>
                </div>
                {review.comment && (
                  <p className="text-[11px] text-slate-600 leading-relaxed italic">"{review.comment}"</p>
                )}
              </div>
            )}

            <p className="mt-3 text-center text-[10px] text-slate-400 font-medium">
              Thank you for choosing servego24!
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 px-4 pb-4 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row gap-2 print-hidden">
          <button
            onClick={() => window.print()}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold p-2.5 rounded-xl text-xs flex items-center justify-center gap-2 focus:outline-none"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Document</span>
          </button>
          <button
            onClick={onClose}
            className="sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-2.5 sm:px-6 rounded-xl text-xs focus:outline-none"
          >
            Close Receipt
          </button>
        </div>
      </div>

      {/* Print-only styles: hide everything except the receipt */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .receipt-modal, .receipt-modal * { visibility: visible !important; }
          .receipt-modal {
            position: absolute !important;
            inset: 0 !important;
            background: white !important;
            z-index: 99999 !important;
            padding: 0 !important;
            backdrop-filter: none !important;
          }
          .receipt-modal > div {
            max-height: none !important;
            max-width: 100% !important;
            border-radius: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .print-hidden { display: none !important; }
          .receipt-printable { overflow: visible !important; max-height: none !important; }
        }
      `}</style>
    </div>
  );
}
