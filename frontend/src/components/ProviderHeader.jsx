import React, { useMemo } from 'react';
import { ReputationBadgeStrip, VerificationLevelPill } from './ProviderReputation';
import { Star, Loader2 } from 'lucide-react';

function ServiceChip({ name }) {
  return (
    <span className="bg-emerald-100 text-emerald-800 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300">
      {name}
    </span>
  );
}

export default function ProviderHeader({ provider, email = '', joinedDate = null, completedJobs = 0, totalJobs = 0, approvedServices = [], loadingServices = false }) {
  const approvedNames = useMemo(
    () => approvedServices.map(s => s.name).filter(Boolean),
    [approvedServices]
  );

  const fullName = provider?.name || '';
  const joined = joinedDate
    ? new Date(joinedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="rounded-3xl mb-4 overflow-hidden text-left bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 border border-indigo-900/50 shadow-[0_18px_40px_-18px_rgba(49,46,129,0.55)]">
      {/* Identity + approved services, avatar centered on the left */}
      <div className="flex items-center gap-4 p-4 sm:p-6">
        <div className="shrink-0">
          {(() => {
            const avatarSrc = provider?.avatar || provider?.photo;

            return avatarSrc ? (
              <img
                className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl object-cover border border-white/20 ring-2 ring-white/10 shrink-0"
                src={avatarSrc}
                alt={`${fullName || 'Provider'} avatar`}
              />
            ) : (
              <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center font-extrabold text-lg shrink-0">
                {fullName.substring(0, 2).toUpperCase() || 'PR'}
              </div>
            );
          })()}
        </div>

        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Identity */}
          <div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[8px] sm:text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wide">
                Active Specialist
              </span>
              <span className="text-[8px] sm:text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded uppercase font-bold">
                {provider.category} Sector
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-extrabold text-white mt-1 leading-none truncate">{fullName}</h2>
            <p className="text-indigo-200/80 text-[11px] sm:text-xs mt-1 font-medium truncate">
              {email}
              <span className="hidden sm:inline"> • Joined {joined}</span>
            </p>
            <p className="text-indigo-200/80 text-[11px] font-medium mt-0.5 sm:hidden">Joined {joined}</p>
          </div>

          {/* Approved services + badges */}
          <div className="pt-2.5 border-t border-white/10 space-y-2">
            {loadingServices ? (
              <div className="text-[10px] text-indigo-200/70 font-semibold flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading approved services...
              </div>
            ) : (
              <div>
                <span className="text-[8px] text-indigo-300/80 uppercase font-extrabold block tracking-wider mb-1">Approved Services</span>
                <div className="flex flex-wrap gap-1">
                  {approvedNames.length ? (
                    approvedNames.map((n, idx) => <ServiceChip key={`${n}-${idx}`} name={n} />)
                  ) : (
                    <span className="text-[10px] text-indigo-200/60 font-semibold">No approved services yet.</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <VerificationLevelPill provider={provider} />
              <ReputationBadgeStrip badges={provider.badges} limit={3} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-8 text-center bg-white/5 border-t border-white/10 p-3 sm:p-5">
        <div>
          <span className="text-[8px] sm:text-[9px] uppercase font-extrabold text-indigo-200/70 block tracking-wider mb-0.5">Rating</span>
          <span className="text-sm sm:text-lg font-black text-amber-400 block flex items-center gap-1 justify-center"><Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {provider.rating}</span>
        </div>
        <div className="border-x border-white/10">
          <span className="text-[8px] sm:text-[9px] uppercase font-extrabold text-indigo-200/70 block tracking-wider mb-0.5">Total Jobs</span>
          <span className="text-sm sm:text-lg font-black text-indigo-300 block">{totalJobs}</span>
        </div>
        <div>
          <span className="text-[8px] sm:text-[9px] uppercase font-extrabold text-indigo-200/70 block tracking-wider mb-0.5">Completed</span>
          <span className="text-sm sm:text-lg font-black text-white block">{completedJobs}</span>
        </div>
      </div>
    </div>
  );
}