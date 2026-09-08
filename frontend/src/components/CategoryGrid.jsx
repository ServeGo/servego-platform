import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useData } from '../context/AppContext';
import CategoryIcon from './CategoryIcon';

export default function CategoryGrid({ categories, providers, onCategoryClick, onSeeAll }) {
  const { services: backendServices } = useData();

  // Prefer the live backend catalog used by the Services page. If the parent
  // does not provide a list yet, fall back to the app context data fetched from /services.
  const safeProviders = Array.isArray(providers) ? providers : [];
  const sourceCategories = Array.isArray(categories) && categories.length > 0
    ? categories
    : Array.isArray(backendServices)
      ? backendServices
      : [];

  const safeCategories = sourceCategories
    .filter((cat) => cat && cat.isHidden !== true && cat.hidden !== true)
    .sort((a, b) => {
      const aCount = typeof a.activeSpecialistCount === 'number' ? a.activeSpecialistCount : 0;
      const bCount = typeof b.activeSpecialistCount === 'number' ? b.activeSpecialistCount : 0;
      if (bCount !== aCount) return bCount - aCount;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  const homeCategories = safeCategories.slice(0, 8);

  const localCategoryImages = {
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

const getCategoryImage = (cat) => {
    // The admin-uploaded catalog image (Cloudinary URL) is the source of truth.
    // Local bundled PNGs remain the fallback for services without an image.
    if (cat?.image) return cat.image;
    const localImage = localCategoryImages[(cat?.name || '').toLowerCase()];
    if (localImage) return localImage;
    if ((cat?.name || '').toLowerCase() === 'ac repair') return '/images/ac-repair-service.png';
    return null;
  };

  return (
    <section className="mx-auto max-w-6xl px-4 pt-16 pb-4 sm:pt-20">
      <div>
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-sans text-slate-900 leading-none">All Services</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-medium">Pick from our list of high-quality home services</p>
          </div>
          <button 
            onClick={onSeeAll}
            className="mt-4 md:mt-0 inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-2 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-teal-800 focus:outline-none"
          >
            <span>See All Services</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {homeCategories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No services are currently available to display.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {homeCategories.map((cat, index) => {
          // Prefer server-derived count; fall back to client-side count for static entries
          const activeCount = typeof cat.activeSpecialistCount === 'number'
            ? cat.activeSpecialistCount
            : safeProviders.filter(
                (p) => (p.category || '').toLowerCase() === (cat.name || '').toLowerCase() && p.isVerified
              ).length;
          
          const categoryImage = getCategoryImage(cat);

          return (
           <div 
             key={cat.id}
             onClick={() => onCategoryClick(cat.name || cat.id)}
             className={`bg-slate-50/80 p-4 rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between ${index >= 4 ? 'hidden sm:flex' : ''}`}
           >
             <div>
               <div className="relative mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                 {categoryImage ? (
                   <div className="relative block aspect-[16/10] w-full overflow-hidden bg-white">
                     <img
                       src={categoryImage}
                       alt={cat.name}
                       className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] ${
                         (cat?.name || '').toLowerCase() === 'home maintenance'
                           ? 'object-[50%_42%]'
                           : 'object-center'
                       }`}
                     />
                   </div>
                 ) : (
                   <div className="h-32 w-full bg-gradient-to-br from-teal-50 to-slate-100 flex items-center justify-center text-teal-700">
                     <CategoryIcon name={cat.name} className="w-8 h-8" />
                   </div>
                 )}
               </div>
               <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors uppercase tracking-tight">{cat.name}</h3>
               <p className="text-slate-500 text-sm mt-2 line-clamp-2">{cat.description}</p>
             </div>
               
             <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs mt-4">
               <span className="text-slate-500 font-medium">{activeCount} Active Specialists</span>
               <button
                 type="button"
                 aria-label={`View ${cat.name} services`}
                 onClick={(event) => {
                   event.stopPropagation();
                   onCategoryClick(cat.name || cat.id);
                 }}
                 className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-teal-700 transition-colors hover:bg-teal-700 hover:text-white"
               >
                 <ChevronRight className="h-4 w-4" />
               </button>
               {cat.basePrice && <span className="text-teal-700 font-extrabold">Starts from ₹{cat.basePrice}</span>}
             </div>
           </div>
          );
        })}
          </div>
        )}
      </div>
    </section>
  );
}
