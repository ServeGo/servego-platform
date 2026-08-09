import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function BookingSuccess({ details, onDashboard, onBrowse }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center shadow-2xl animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <span className="text-[10px] bg-amber-100 font-extrabold text-amber-800 px-2.5 py-1 rounded uppercase tracking-widest border border-amber-200">
          Request Sent
        </span>
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-4 font-sans tracking-tight leading-none">Waiting for a Specialist</h3>
        <p className="text-slate-500 text-xs mt-2 font-bold uppercase tracking-tight">
          Booking ID: <span className="text-indigo-600">{details.id}</span>
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 my-6 text-left text-xs font-bold space-y-2">
          <p className="text-amber-900 leading-relaxed">
            Your request has been sent to all eligible specialists in your area. The first
            specialist to accept your job will be assigned automatically.
          </p>
          <p className="text-amber-700">
            You can track the status in the Pending tab of your dashboard. Once a specialist
            accepts, their details and live location will appear.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-left text-xs font-bold space-y-2">
          <div className="flex justify-between text-slate-500">
            <span>Booked:</span>
            <span className="text-slate-900">{details.bookingDateLabel || details.createdAt}</span>
          </div>
          <div className="flex justify-between text-slate-550 pt-2 border-t border-slate-200">
            <span>Service:</span>
            <span className="text-slate-900">{details.serviceCategory}</span>
          </div>
        </div>

        <div className="space-y-2">
          <button 
            onClick={onDashboard}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-xl text-center text-xs transition-all shadow-md focus:outline-none"
          >
            Go to My Dashboard
          </button>
          <button 
            onClick={onBrowse}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-3 rounded-xl text-center text-xs transition-all focus:outline-none"
          >
            Book Another Service
          </button>
        </div>
      </div>
    </div>
  );
}
