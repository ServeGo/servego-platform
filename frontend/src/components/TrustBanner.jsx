import React from 'react';
import { ArrowRight, Star } from 'lucide-react';

const REVIEWS = [
  {
    quote: 'Booked an electrician in minutes. The technician arrived on time and the work was completed quickly.',
    name: 'Rahul K.',
    city: 'Hyderabad',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
  },
  {
    quote: 'Great experience! Very professional and polite. Fixed my AC within an hour. Highly recommended.',
    name: 'Sneha M.',
    city: 'Hyderabad',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
  },
  {
    quote: 'Sofa cleaning service was excellent. My sofa looks like new again. Easy booking and good service.',
    name: 'Amit P.',
    city: 'Hyderabad',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
  },
];

export default function TrustBanner({ onBrowse }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0f172a] leading-none">
            Customers Trust ServeGo24
          </h2>
          <p className="mt-1.5 text-sm sm:text-base text-slate-600 font-medium">
            Real experiences from real customers.
          </p>
        </div>

        <button
          type="button"
          onClick={onBrowse}
          className="hidden items-center gap-2 rounded-full text-[#0f172a] text-base font-semibold transition-colors hover:text-teal-700 sm:inline-flex"
        >
          <span>View All Reviews</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {REVIEWS.map((review) => (
          <article key={review.name} className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.28)]">
            <div className="mb-2.5 flex gap-1 text-[#f7b500]">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star key={idx} className="h-4 w-4 fill-current" />
              ))}
            </div>

            <p className="text-base leading-relaxed font-medium text-[#0f172a]" style={{ fontFamily: 'system-ui, sans-serif' }}>
              “{review.quote}”
            </p>

            <div className="mt-4 flex items-center gap-3">
              <img
                src={review.avatar}
                alt={review.name}
                className="h-11 w-11 rounded-full object-cover border-2 border-slate-200"
              />
              <div>
                <p className="text-base font-semibold text-[#0f172a]">{review.name}</p>
                <p className="text-sm text-slate-600">{review.city}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
