import React from 'react';
import { Download, X } from 'lucide-react';
import Logo from './Logo';

export default function InvoiceModal({ booking, onClose }) {
  const issuedLabel = booking.bookingDateLabel || booking.createdAt;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-[80dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden text-slate-800 text-left">

        {/* Header — always visible */}
        <div className="shrink-0 px-4 pt-3 pb-2.5 border-b border-slate-100 flex items-center justify-between gap-3">
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
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
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

            {/* Line item */}
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

            <p className="mt-3 text-center text-[10px] text-slate-400 font-medium">
              Thank you for choosing servego24!
            </p>
          </div>
        </div>

        {/* Actions — always visible */}
        <div className="shrink-0 px-4 pb-4 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
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
    </div>
  );
}
