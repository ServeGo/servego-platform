import React from 'react';
import { MapPin, Star } from 'lucide-react';
import { ReputationBadgeStrip, VerificationLevelPill } from './ProviderReputation';

export default function ProviderListItem({ 
  provider, 
  isFavorite, 
  onToggleFavorite, 
  onBook 
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all p-6 text-left">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Profile Info */}
        <div className="flex items-center lg:items-start gap-4 shrink-0 lg:w-48 text-left">
          <img 
            src={provider.avatar} 
            alt={provider.name}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-200"
          />
          <div>
            {provider.isVerified && <VerificationLevelPill provider={provider} />}
            <h4 className="font-bold text-slate-900 mt-1 line-clamp-1 text-sm sm:text-base leading-tight">{provider.name}</h4>
            
            <div className="flex items-center gap-1 mt-1 text-xs">
              <span className="text-amber-500 font-bold"><Star className="w-3.5 h-3.5 inline-block text-amber-400" /> {provider.rating}</span>
              <span className="text-slate-500 font-medium">({provider.reviewCount} reviews)</span>
            </div>
            <div className="mt-2">
              <ReputationBadgeStrip badges={provider.badges} limit={2} />
            </div>
          </div>
        </div>

        {/* Bio & Specialties */}
        <div className="flex-1 space-y-4">
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium">{provider.bio}</p>

          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Expertise Focus</span>
            <div className="flex flex-wrap gap-1">
              {provider.specialties.map((spec, idx) => (
                <span key={idx} className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-1 rounded border border-slate-200/50">
                  {spec}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-wrap text-xs font-semibold text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Active zones:</span>
            <div className="flex flex-wrap gap-1">
              {provider.serviceAreas.map((area, idx) => (
                <span key={idx} className="bg-indigo-50 text-indigo-750 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-indigo-100/40">
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full lg:w-48 lg:border-l lg:border-slate-100 lg:pl-6 space-y-4 flex flex-row lg:flex-col justify-between items-center lg:items-stretch gap-4 shrink-0 mt-4 lg:mt-0">
          <div className="space-y-2 w-full lg:w-full">
            <button 
              onClick={() => onBook(provider)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2.5 rounded-lg text-xs text-center transition-all shadow-xs focus:outline-none border border-indigo-500/10"
            >
              Book Professional Appointment
            </button>
            
            <button 
              onClick={() => onToggleFavorite(provider.id)}
              className={`w-full py-2.5 rounded-xl text-[11px] font-bold border transition-all text-center focus:outline-none ${
                isFavorite 
                  ? 'bg-rose-50 border-rose-300 text-rose-700 font-extrabold' 
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{isFavorite ? '♥ Added to Favorites' : '♡ Save Specialist'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
