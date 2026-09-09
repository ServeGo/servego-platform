import React, { useState } from 'react';
import { ArrowDown, ArrowRight, Star, Users } from 'lucide-react';
import CategoryIcon from './CategoryIcon';

/**
 * Modern service category card — rounded glass-tile design with gradient
 * icon, rating + specialist pill meta, clickable popular-request chips and a
 * full-width Book Now action.
 */
export default function ServiceCard({
  category,
  providers,
  onSelect,
}) {
  const [issuesOpen, setIssuesOpen] = useState(false);
  const safeProviders = Array.isArray(providers) ? providers : [];
  const localServiceImages = {
    electrician: '/images/electrician-service.png',
    plumber: '/images/plumber-service.png',
    'ac repair': '/images/ac-repair-service.png',
'home cleaning': '/images/home-cleaning-service.png',
    'deep cleaning': '/images/deep-cleaning-service.png',
    'modular kitchen': '/images/Modular%20Kitchen.png',
    painting: '/images/painting-service.png',
    'appliance repair': '/images/appliance-repair-service.png',
    'appliance installation': '/images/Appliance%20Installation.png',
    carpentry: '/images/carpentry-service.png',
    cooking: '/images/Cooking.png',
    'cctv installation': '/images/CCTV%20Installation.png',
    'geyser & water heater': '/images/geyser-water-heater-service.png',
    'home maintenance': '/images/home-maintenance-service.png',
    'interior design': '/images/Interior%20Design.png',
    'packers & movers': '/images/packers-movers-service.png',
    'pest control': '/images/Pest%20Control.png',
    'salon at home': '/images/Salon%20at%20Home.png',
'sofa cleaning': '/images/Sofa%20Cleaning.png',
    'tile & grouting': '/images/tile-grouting-service.png',
    'water tank cleaning': '/images/Water%20Tank%20Cleaning.png',
  };
const serviceName = (category?.name || '').toLowerCase();
  const serviceImage = category?.image || localServiceImages[serviceName] || null;

  // Prefer server-derived count; fall back to client-side count
  const activeCount = typeof category.activeSpecialistCount === 'number'
    ? category.activeSpecialistCount
    : safeProviders.filter(
        (p) => (p.category || '').toLowerCase() === (category.name || '').toLowerCase() && p.isVerified
      ).length;

  const verifiedProviders = safeProviders.filter(
    (p) => (p.category || '').toLowerCase() === (category.name || '').toLowerCase() && p.isVerified
  );
  const bestRating = verifiedProviders.length > 0
    ? Math.max(...verifiedProviders.map((p) => p.rating))
    : 5.0;

  const issues = Array.isArray(category.popularIssues)
    ? category.popularIssues.slice(0, 3)
    : [];

  return (
    <article className="relative group flex flex-col justify-between bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-[0_26px_56px_-26px_rgba(15,23,42,0.35)] hover:-translate-y-1 hover:border-teal-300 transition-all text-left">
      {/* Accent bar appears on hover */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-indigo-500 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />

      {serviceImage ? (
        <div className="relative block aspect-[16/10] w-full overflow-hidden border-b border-slate-100 bg-white">
          <img
            src={serviceImage}
            alt={category.name}
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] ${
              serviceName === 'home maintenance' ? 'object-[50%_42%]' : 'object-center'
            }`}
          />
        </div>
      ) : null}

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/15 to-indigo-500/15 text-teal-700 flex items-center justify-center ring-1 ring-teal-500/10 shrink-0">
            <CategoryIcon name={category.name} className="w-6 h-6" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 text-[10px] font-black flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
              {bestRating}
            </span>
            <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
              <Users className="w-3 h-3" />
              {activeCount} active
            </span>
          </div>
        </div>

        <h3 className="mt-4 text-lg font-extrabold text-slate-900 tracking-tight capitalize">
          {category.name}
        </h3>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium line-clamp-2 sm:line-clamp-3">
          {category.description}
        </p>

        {issues.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              aria-expanded={issuesOpen}
              onClick={() => setIssuesOpen((open) => !open)}
              className="flex w-full items-center justify-between text-left sm:hidden"
            >
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                Popular requests
              </span>
              <ArrowDown className={`h-4 w-4 text-slate-400 transition-transform ${issuesOpen ? 'rotate-180' : ''}`} />
            </button>
            <span className="hidden text-[10px] font-black text-slate-400 uppercase tracking-wide sm:block">
              Popular requests
            </span>
            <div className={`${issuesOpen ? 'flex' : 'hidden'} mt-2 flex-wrap gap-1.5 sm:flex`}>
                {issues.map((issue, idx) => (
                  <span
                    key={idx}
                    className="bg-slate-50 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200/70 select-none"
                  >
                    {issue}
                  </span>
                ))}
              </div>
          </div>
        )}
      </div>

      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-1">
        <button
          type="button"
          onClick={() => onSelect(category.id || category.name)}
          className="w-full bg-slate-900 hover:bg-teal-600 text-white font-black text-xs rounded-2xl py-3 flex items-center justify-center gap-2 transition-all group-hover:shadow-lg"
        >
          <span className="inline-flex items-center gap-2">
            <span>Book Now</span>
            <span className="rounded-full bg-white/12 px-2 py-0.5 text-[10px] font-bold text-[#dffaf8]">₹199</span>
          </span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </article>
  );
}
