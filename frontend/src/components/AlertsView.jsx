import React from 'react';
import { Bell, BellRing, CheckCircle2 } from 'lucide-react';

/**
 * Real-time "Alerts" tab content. An alert is a temporary, action-required
 * prompt (new lead, quotation received, provider assigned/changed). Reading it
 * here REVIEWS it — the row is deleted from the backend (via onReview) and the
 * socket notifies other devices, so alerts never pile up like notifications.
 */
export default function AlertsView({ alerts = [], onReview, onReviewAll, loading = false }) {
  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dff7f5] ring-1 ring-[#cfeee8]">
            <Bell className="h-5 w-5 text-[#1ec5b7]" strokeWidth={2.2} />
          </span>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Your Alerts</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Action required — handled alerts clear automatically.
            </p>
          </div>
        </div>
        {alerts.length > 0 && (
          <button
            onClick={onReviewAll}
            className="text-xs text-indigo-600 hover:underline font-bold"
          >
            Clear all
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50 animate-pulse">
              <div className="h-3 w-1/3 bg-slate-200 rounded mb-2" />
              <div className="h-2.5 w-2/3 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <CheckCircle2 className="w-8 h-8 text-teal-500 mx-auto mb-2" strokeWidth={2.5} />
          <h4 className="text-sm font-bold text-slate-900">You're all caught up</h4>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => onReview(alert.id)}
              className="p-4 rounded-xl border border-rose-100 bg-rose-50/40 shadow-3xs transition-all cursor-pointer hover:border-rose-200 hover:bg-rose-50"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-7 h-7 shrink-0 rounded-lg bg-rose-500 text-white flex items-center justify-center">
                  <BellRing className="w-3.5 h-3.5" strokeWidth={2.5} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="text-xs font-extrabold text-slate-900">{alert.title}</h4>
                    <span className="shrink-0 text-[9px] font-mono text-slate-400 font-normal">
                      {new Date(alert.timestamp || alert.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs mt-1 font-medium">{alert.message}</p>
                  <p className="text-[10px] text-rose-500 font-bold mt-2 uppercase tracking-wide">
                    Tap to review
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}