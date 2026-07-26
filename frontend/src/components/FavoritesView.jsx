import React from 'react';
import { Heart } from 'lucide-react';

export default function FavoritesView({ favorites, onToggleFavorite, onNavigate }) {
  if (favorites.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-2xs max-w-md mx-auto">
        <Heart className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <h4 className="text-base font-bold text-slate-900">No Saved Pros</h4>
        <p className="text-slate-500 text-xs mt-1 font-medium">Save providers to quickly book them again in the future.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
      {favorites.map((prov) => (
        <div key={prov.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between gap-4 shadow-3xs">
          <div className="flex gap-4 items-center justify-between">
            <div className="flex gap-4 items-center">
              <img
                className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                src={prov.avatar || prov.photo || ''}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"%3E%3Crect width="120" height="120" rx="20" fill="%23e2e8f0"/%3E%3Cpath d="M60 62c10 0 18-9 18-20S70 22 60 22 42 31 42 42s8 20 18 20zm0 12c-18 0-34 9-34 22v2h68v-2c0-13-16-22-34-22z" fill="%236b7280"/%3E%3C/svg%3E';
                }}
                alt={prov.name || 'Provider'}
              />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{prov.name}</h4>
                <span className="text-xs text-indigo-600 font-bold block">{prov.category}</span>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-amber-500 font-bold">
                  <span>★ {prov.rating}</span>
                  <span className="text-slate-400 font-medium">({prov.reviewCount} reviews)</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <button 
                onClick={() => onToggleFavorite(prov.id)}
                className="p-1 px-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs rounded-lg transition-colors"
              >
                Remove
              </button>
              <button 
                onClick={() => onNavigate('service-details', prov.category)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-1 px-3 text-xs rounded-lg shadow-sm border border-indigo-500/10"
              >
                Book Now
              </button>
            </div>
          </div>

          <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed font-medium">{prov.serviceDescription || prov.bio}</p>
        </div>
      ))}
    </div>
  );
}
