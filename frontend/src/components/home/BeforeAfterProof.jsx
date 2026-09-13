import React from 'react';
import { ArrowRight } from 'lucide-react';
import { BEFORE_AFTER } from './homeImages';

export default function BeforeAfterProof() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      {/* Header */}
      <div className="mb-10">
        <span className="text-teal-700 font-bold uppercase tracking-[0.2em] text-[11px]">
          Proof of Quality
        </span>
        <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Before & After <span className="text-teal-700">Visual Proof</span>
        </h2>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
        {BEFORE_AFTER.map((item, idx) => (
          <div
            key={idx}
            className="group relative overflow-hidden rounded-2xl aspect-[16/10] cursor-pointer"
          >
            {/* Image */}
            <img
              src={item.image}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8">
              <h3 className="text-lg sm:text-xl font-bold text-white leading-tight drop-shadow-lg">
                {item.title}
              </h3>
              <div className="mt-3 flex items-center gap-2 text-emerald-300 text-xs font-bold group-hover:gap-3 transition-all">
                <span>View transformation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Before/After badge */}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="bg-red-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                Before
              </span>
              <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                After
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
