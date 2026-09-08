import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useUI } from '../context/AppContext';

const SLIDE_MS = 5000;

const BANNERS = [
  {
    id: 'banner1',
    images: ['/images/banner1.png', '/images/banner 1.png'],
    catId: 'General Home Services',
    label: 'Book a Service',
  },
  {
    id: 'banner2',
    images: ['/images/banner2.png', '/images/banner 2.png'],
    catId: 'AC Service',
    label: 'Book AC Service',
  },
  {
    id: 'banner3',
    images: ['/images/banner3.png', '/images/banner 3.png'],
    catId: 'Sofa Cleaning',
    label: 'Book Sofa Cleaning',
  },
  {
    id: 'banner4',
    images: ['/images/banner4.png', '/images/banner 4.png'],
    catId: 'Water Tank Cleaning',
    label: 'Book Water Tank Cleaning',
  },
];

export default function BannerCarousel({ onNavigate }) {
  const { setSearchQuery } = useUI();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = BANNERS.length;

  const goTo = useCallback(
    (next) => {
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => goTo(index + 1), SLIDE_MS);
    return () => clearInterval(timer);
  }, [index, paused, goTo]);

  const handleBook = (banner, e) => {
    e.preventDefault();
    sessionStorage.setItem('servego_booking_intent', JSON.stringify({ catId: banner.catId }));
    setSearchQuery(banner.catId);
    onNavigate('services');
  };

  return (
    <section aria-label="ServeGo24 offers" aria-roledescription="carousel" className="mx-auto max-w-[1320px] px-3 pt-4 sm:px-4 sm:pt-5">
      <div
        className="group relative overflow-hidden rounded-[20px] sm:rounded-[28px] bg-slate-100 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {BANNERS.map((banner, i) => (
            <div
              key={banner.id}
              aria-hidden={i !== index}
              className={`min-w-full shrink-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}
            >
              <button
                type="button"
                onClick={(e) => handleBook(banner, e)}
                className="relative block w-full aspect-[16/10] sm:aspect-[18/7] lg:aspect-[22/7] overflow-hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/40 cursor-pointer"
                aria-label={`${banner.label}`}
              >
                <img
                  src={banner.images[0]}
                  alt={banner.label}
                  draggable={false}
                  onError={(event) => {
                    const current = event.currentTarget.getAttribute('src');
                    const fallbackIndex = banner.images.indexOf(current) + 1;
                    const next = banner.images[fallbackIndex] || '/images/public-home-hero.png';
                    event.currentTarget.src = next;
                  }}
                  style={{ objectPosition: 'center center' }}
                  className="absolute inset-0 h-full w-full rounded-[inherit] bg-white object-contain p-0.5 sm:p-2 select-none pointer-events-none"
                />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label="Previous banner"
          className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md transition hover:bg-white hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/40"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label="Next banner"
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md transition hover:bg-white hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/40"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {BANNERS.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to banner ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 ${
                i === index ? 'w-6 bg-teal-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}