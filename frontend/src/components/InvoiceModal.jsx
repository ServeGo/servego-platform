import React from 'react';
import { Download } from 'lucide-react';

export default function InvoiceModal({ booking, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 max-w-xl w-full relative shadow-2xl animate-fade-in text-slate-800 text-left">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-150 mb-6">
          <div>
            <span className="text-[10px] bg-indigo-150 text-indigo-800 px-2.5 py-0.5 rounded uppercase font-bold tracking-wide">
              Service Summary
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">Receipt #{booking.id}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold"
          >
            Close
          </button>
        </div>

        {/* Invoice Format */}
        <div className="border border-slate-200 rounded-xl p-6 bg-white space-y-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h4 className="text-lg font-extrabold text-indigo-600 font-sans tracking-tight">ServeGo Inc.</h4>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Hyderabad Operations Node</span>
            </div>
            <div className="text-right text-xs">
              <span className="text-slate-500 block">Date Issued</span>
              <span className="text-slate-900 font-bold">{booking.bookingDateLabel || booking.createdAt}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold bg-slate-50 p-4 rounded-xl">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">To Customer</span>
              <span className="text-slate-800 font-bold block">{booking.customerName}</span>
              <span className="text-slate-500 font-normal leading-relaxed block mt-0.5">{booking.locationAddress}</span>
              <span className="text-slate-500 font-normal block">{booking.customerEmail}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">From Specialist</span>
              <span className="text-slate-800 font-bold block">{booking.providerName}</span>
              <span className="text-slate-500 font-normal block mt-0.5">Category: {booking.serviceCategory}</span>
              <span className="text-slate-500 font-normal block">ID: {booking.id}</span>
            </div>
          </div>

          <table className="w-full text-xs font-semibold text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2.5">
                  <span className="font-bold text-slate-900 block">{booking.serviceCategory} Service</span>
                  <span className="text-[10px] text-slate-500">Completed on {booking.bookingDateLabel || booking.createdAt}</span>
                </td>
                <td className="py-2.5 text-right text-slate-800 capitalize">{booking.status}</td>
              </tr>
            </tbody>
          </table>

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
            <div className="text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
              Service Completed
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-[10px] uppercase block">Settlement</span>
              <span className="text-sm font-extrabold text-indigo-600 block leading-none">Direct with specialist</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button 
            onClick={() => window.print()} 
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold p-3 rounded-xl text-xs flex items-center justify-center gap-2 focus:outline-none"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Document</span>
          </button>
          <button 
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-3 px-6 rounded-xl text-xs focus:outline-none"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
