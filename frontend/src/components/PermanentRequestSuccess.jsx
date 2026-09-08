import { CheckCircle2 } from 'lucide-react';

const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function PermanentRequestSuccess({ request, onDashboard, onBrowse }) {
  const isCustom = request.requestType === 'CUSTOM';

  const durationText = !isCustom && request.engagementType === 'CONTRACT'
    ? request.contractDurationYears
      ? `${request.contractDurationYears} year${request.contractDurationYears > 1 ? 's' : ''}`
      : `${request.contractDurationDays} day${request.contractDurationDays > 1 ? 's' : ''}`
    : 'Ongoing';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center shadow-2xl animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Request Submitted</h3>
        <p className="text-slate-500 text-xs mt-2 font-medium leading-relaxed">
          {isCustom
            ? `Your request for "${request.customServiceName || request.serviceCategory}" has been received. Our team will review it, add the service, and arrange a suitable specialist for you.`
            : `Your ${request.serviceCategory} request for a ${request.engagementType === 'CONTRACT' ? 'contract' : 'permanent'} engagement
            has been received. Our team will review it and arrange a suitable specialist for you.`}
        </p>

        <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs font-bold">
          {isCustom ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase tracking-wide text-[10px]">Service</span>
                <span className="text-slate-800 capitalize">{request.customServiceName || request.serviceCategory}</span>
              </div>
              {request.customDescription && (
                <div className="flex flex-col items-start gap-1">
                  <span className="text-slate-500 uppercase tracking-wide text-[10px]">Description</span>
                  <span className="text-slate-800 text-left leading-relaxed">{request.customDescription}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase tracking-wide text-[10px]">Type</span>
                <span className="text-slate-800">Custom Service</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase tracking-wide text-[10px]">Type</span>
                <span className="text-slate-800 capitalize">{request.engagementType === 'CONTRACT' ? 'Contract' : 'Permanent'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase tracking-wide text-[10px]">Start Date</span>
                <span className="text-slate-800">{formatDate(request.startDate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase tracking-wide text-[10px]">Duration</span>
                <span className="text-slate-800">{durationText}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase tracking-wide text-[10px]">Monthly Budget</span>
                <span className="text-slate-800">{`₹${Number(request.monthlyBudget).toLocaleString('en-IN')}`}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-500 uppercase tracking-wide text-[10px]">Status</span>
            <span className="text-slate-800">Pending review</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <button
            onClick={onDashboard}
            className="cursor-pointer w-full bg-teal-600 hover:bg-teal-700 text-white font-bold p-3 rounded-lg text-center text-sm transition-all shadow-md"
          >
            View My Requests
          </button>
          <button
            onClick={onBrowse}
            className="cursor-pointer w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-3 rounded-lg text-center text-sm transition-all"
          >
            Continue Browsing
          </button>
        </div>
      </div>
    </div>
  );
}