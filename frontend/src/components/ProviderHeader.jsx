import React, { useMemo } from 'react';
import { ReputationBadgeStrip, VerificationLevelPill } from './ProviderReputation';
import { Star, Loader2 } from 'lucide-react';

function ServiceChip({ name }) {
  return (
    <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded border border-emerald-200">
      {name}
    </span>
  );
}

export default function ProviderHeader({ provider, completedJobs = 0, totalJobs = 0, approvedServices = [], loadingServices = false }) {
  const approvedNames = useMemo(
    () => approvedServices.map(s => s.name).filter(Boolean),
    [approvedServices]
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 text-left">
      {/* Info */}
      <div className="flex gap-4 items-center min-w-0">

        {(() => {
          const avatarSrc = provider?.avatar || provider?.photo;
          const name = provider?.name || '';

          return avatarSrc ? (
            <img
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
              src={avatarSrc}
              alt={`${name || 'Provider'} avatar`}
            />
          ) : (
            <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-extrabold text-base border border-indigo-500/20 shrink-0">
              {name.substring(0, 2).toUpperCase() || 'PR'}
            </div>
          );
        })()}

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded uppercase font-extrabold tracking-wide">
              Active Specialist
            </span>
            <span className="bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded uppercase font-bold">
              {provider.category} Sector
            </span>
          </div>

          <h2 className="text-lg font-extrabold text-slate-900 mt-1 leading-none truncate">{provider.name}</h2>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">
            {provider.phone} • Hyderabad Node
          </p>

          {loadingServices ? (
            <div className="mt-3 text-[10px] text-slate-500 font-semibold flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading approved services...
            </div>
          ) : (
            <div className="mt-3">
              <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wider mb-1.5">Approved Services</span>
              <div className="flex flex-wrap gap-1.5">
                {approvedNames.length ? (
                  approvedNames.map((n, idx) => <ServiceChip key={`${n}-${idx}`} name={n} />)
                ) : (
                  <span className="text-[10px] text-slate-400 font-semibold">No approved services yet.</span>
                )}
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <VerificationLevelPill provider={provider} />
            <ReputationBadgeStrip badges={provider.badges} limit={3} />
          </div>
        </div>

      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shrink-0">
        <div>
          <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wider mb-1">Rating</span>
          <span className="text-base sm:text-lg font-black text-amber-500 block flex items-center gap-1 justify-center"><Star className="w-4 h-4" /> {provider.rating}</span>
        </div>
        <div className="border-x border-slate-200">
          <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wider mb-1">Total Jobs</span>
          <span className="text-base sm:text-lg font-black text-indigo-600 block">{totalJobs}</span>
        </div>
        <div>
          <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wider mb-1">Completed</span>
          <span className="text-base sm:text-lg font-black text-slate-900 block">{completedJobs}</span>
        </div>
      </div>
    </div>
  );
}