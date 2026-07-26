import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ReputationBadgeStrip, VerificationLevelPill } from './ProviderReputation';
import { Star, Loader2 } from 'lucide-react';

function ServiceChip({ name }) {
  return (
    <span className="bg-emerald-500/10 text-emerald-300 text-[10px] font-bold px-2 py-1 rounded border border-emerald-500/20">
      {name}
    </span>
  );
}

export default function ProviderHeader({ provider, completedJobs = 0, totalJobs = 0, approvedServices = [], loadingServices = false }) {
  const { currentUser } = useApp();

  const approvedNames = useMemo(
    () => approvedServices.map(s => s.name).filter(Boolean),
    [approvedServices]
  );

  return (
    <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden text-left">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_right_top,#1e293b_10%,transparent_50%)] pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        
        {/* Info */}
        <div className="flex gap-4 items-center">

          {(() => {
            const avatarSrc = provider?.avatar || provider?.photo;
            const name = provider?.name || '';

            return avatarSrc ? (
              <img
                className="w-14 h-14 rounded-2xl object-cover border-2 border-white/10"
                src={avatarSrc}
                alt={`${name || 'Provider'} avatar`}
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            );
          })()}
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-bold uppercase tracking-wide">
                Active Specialist
              </span>
              <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded uppercase font-bold border border-indigo-500/20">
                {provider.category} Sector
              </span>
            </div>

            {loadingServices ? (
              <div className="mt-2 text-[10px] text-slate-300 font-semibold flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Loading approved services...</div>
            ) : (
              <div className="mt-3">
                <span className="text-[9px] uppercase font-black text-slate-500 block tracking-wider mb-1.5">Approved Services</span>
                <div className="flex flex-wrap gap-1.5">
                  {approvedNames.length ? (
                    approvedNames.map((n, idx) => <ServiceChip key={`${n}-${idx}`} name={n} />)
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold">No approved services yet.</span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] uppercase font-black text-slate-500 block tracking-wider mb-1.5">Trust Level</span>
                <VerificationLevelPill provider={provider} dark />
              </div>
              <div>
                <span className="text-[9px] uppercase font-black text-slate-500 block tracking-wider mb-1.5">Badges</span>
                <ReputationBadgeStrip badges={provider.badges} limit={3} dark />
              </div>
            </div>

            <h2 className="text-2xl font-bold font-sans mt-1.5 tracking-tight">{provider.name}</h2>
            <p className="text-slate-400 text-xs mt-1 font-medium">{provider.phone} • Hyderabad Node</p>
          </div>

        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-6 text-center bg-white/5 border border-white/10 p-4 rounded-2xl shrink-0 text-slate-200">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider mb-1">Rating</span>
            <span className="text-base sm:text-lg font-bold text-amber-400 block flex items-center gap-1 justify-center"><Star className="w-4 h-4" /> {provider.rating}</span>
          </div>
          <div className="border-x border-white/10 px-2 sm:px-4">
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider mb-1">Total Jobs</span>
            <span className="text-base sm:text-lg font-bold text-indigo-400 block">{totalJobs}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider mb-1">Completed</span>
            <span className="text-base sm:text-lg font-bold text-slate-100 block">{completedJobs}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
