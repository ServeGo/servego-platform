import React from 'react';
import { ArrowRight, BadgeCheck, Star } from 'lucide-react';
import { GUARANTEE_IMAGES, PLACEHOLDER_REVIEWS } from './homeImages';

const guarantees = [
  ['Certified Appliance Restoration', 'OEM-grade parts and repairs that protect your appliance.'],
  ['Safe Household Care & Water Purity', 'Every professional is verified for safer work at home.'],
];

function SectionTitle({ eyebrow, title }) {
  return <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-teal-700">{eyebrow}</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{title}</h2></div><BadgeCheck className="hidden h-6 w-6 text-teal-600 sm:block" /></div>;
}

export default function MarketplaceSections({ onBrowse, onBecomePartner }) {
  return <>
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionTitle eyebrow="REAL VALUE GUARANTEE" title="100% Genuine OEM Parts & Hospital-Grade Hygiene" />
      <div className="grid gap-4 md:grid-cols-2">
        {guarantees.map(([title, text], index) => <article key={title} className="group relative min-h-60 overflow-hidden rounded-2xl text-white shadow-lg">
          <img src={GUARANTEE_IMAGES[index]} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5"><span className="rounded-full bg-teal-600 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider">Verified standard</span><h3 className="mt-3 text-lg font-extrabold">{title}</h3><p className="mt-1 text-xs text-white/80">{text}</p></div>
        </article>)}
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="relative overflow-hidden rounded-2xl bg-slate-950 text-white shadow-xl"><img src="https://res.cloudinary.com/dal84gvkm/image/upload/v1789329514/servego/public/havugjnsujtt6ubuabtn.jpg" alt="Family enjoying time at home" className="absolute inset-0 h-full w-full object-cover opacity-50" loading="lazy" /><div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" /><div className="relative max-w-xl p-7 sm:p-10"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-teal-300">For a reliable everyday home</span><h2 className="mt-2 text-2xl font-extrabold">Cherish Clean, Peaceful Family Moments</h2><p className="mt-2 text-sm text-slate-300">Let trusted specialists handle the chores while you enjoy more of what matters.</p><button onClick={onBrowse} className="mt-5 inline-flex items-center gap-1 rounded-full bg-teal-600 px-4 py-2 text-xs font-bold hover:bg-teal-500">Explore services <ArrowRight className="h-3.5 w-3.5" /></button></div></div></section>
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><SectionTitle eyebrow="HYDERABAD'S TRUSTED CHOICE" title="Verified Customer Reviews" /><div className="grid gap-4 md:grid-cols-3">{PLACEHOLDER_REVIEWS.slice(0, 3).map(review => <article key={review.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex gap-0.5 text-amber-400">{Array.from({ length: review.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}</div><p className="mt-3 text-xs leading-relaxed text-slate-600">“{review.text}”</p><div className="mt-4 flex items-center justify-between"><span className="text-xs font-extrabold text-slate-900">{review.name}</span><span className="text-[10px] font-bold text-teal-700">{review.service}</span></div></article>)}</div></section>
    <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
      <div className="grid overflow-hidden rounded-2xl bg-[#071128] text-white shadow-xl md:grid-cols-2">
        <div className="min-h-[260px] md:min-h-[340px]"><img src="https://res.cloudinary.com/dal84gvkm/image/upload/v1789329504/servego/public/ds3qsjiuu2rh1g4gkicn.jpg" alt="Servego specialist" className="h-full w-full object-cover object-center" loading="lazy" /></div>
        <div className="flex items-center bg-[radial-gradient(circle_at_top_right,_rgba(13,124,102,.26),_transparent_54%),#071128] p-8 sm:p-12"><div className="max-w-md"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-teal-300">Build your career with us</span><h2 className="mt-2 text-2xl font-extrabold">Join 1,240+ Hyderabad Specialists</h2><p className="mt-2 text-sm text-slate-300">Grow with verified jobs, flexible hours, and fair earnings.</p><button onClick={onBecomePartner} className="mt-5 inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2.5 text-xs font-bold hover:bg-teal-500">Become a Partner <ArrowRight className="h-3.5 w-3.5" /></button></div></div>
      </div>
    </section>
  </>;
}
