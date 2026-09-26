import React from 'react';

export function SkeletonLoader({ 
  type = 'card', 
  count = 1, 
  className = '' 
}) {
  // Mirrors ServiceCard: fixed-height media block on top, then a title, a
  // meta line, two description lines, a chip row and the CTA line. Matching the
  // real card's box means the swap from skeleton to content does not shift the
  // grid (rule 15).
  const renderCard = () => (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white animate-pulse">
      <div className="h-36 sm:h-40 shrink-0 bg-slate-200" />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="h-4 w-2/3 rounded bg-slate-200" />
        <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
        <div className="mt-3 space-y-2">
          <div className="h-2.5 w-full rounded bg-slate-200" />
          <div className="h-2.5 w-5/6 rounded bg-slate-200" />
        </div>
        <div className="mt-3 flex gap-1.5">
          <div className="h-4 w-16 rounded bg-slate-200" />
          <div className="h-4 w-20 rounded bg-slate-200" />
        </div>
        {/* mt-auto mirrors the real card's bottom-pinned Book now CTA. */}
        <div className="mt-auto flex items-center gap-1.5 pt-4">
          <div className="h-3 w-16 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );

  const renderList = () => (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-slate-200 p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-200 rounded w-1/3" />
              <div className="h-2 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTable = () => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex gap-4">
          <div className="h-3 bg-slate-300 rounded w-1/4" />
          <div className="h-3 bg-slate-300 rounded w-1/4" />
          <div className="h-3 bg-slate-300 rounded w-1/4" />
          <div className="h-3 bg-slate-300 rounded w-1/4" />
        </div>
      </div>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="border-b border-slate-100 px-4 py-3 last:border-0">
          <div className="flex gap-4">
            <div className="h-3 bg-slate-200 rounded w-1/4" />
            <div className="h-3 bg-slate-200 rounded w-1/4" />
            <div className="h-3 bg-slate-200 rounded w-1/4" />
            <div className="h-3 bg-slate-200 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/2 mb-2" />
          <div className="h-4 bg-slate-200 rounded w-3/4" />
        </div>
      ))}
    </div>
  );

  const renderText = () => (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-full" />
      <div className="h-4 bg-slate-200 rounded w-5/6" />
      <div className="h-4 bg-slate-200 rounded w-4/6" />
    </div>
  );

  const renderAvatar = () => (
    <div className="flex items-center gap-3 animate-pulse">
      <div className="w-12 h-12 bg-slate-200 rounded-full" />
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded w-24" />
        <div className="h-3 bg-slate-200 rounded w-16" />
      </div>
    </div>
  );

  const renderBookingCard = () => (
    <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="space-y-2">
          <div className="h-5 bg-slate-200 rounded w-32" />
          <div className="h-3 bg-slate-200 rounded w-24" />
        </div>
        <div className="h-6 bg-slate-200 rounded-full w-20" />
      </div>
      <div className="flex gap-4 mb-4">
        <div className="space-y-1">
          <div className="h-3 bg-slate-200 rounded w-16" />
          <div className="h-2 bg-slate-200 rounded w-12" />
        </div>
        <div className="space-y-1">
          <div className="h-3 bg-slate-200 rounded w-16" />
          <div className="h-2 bg-slate-200 rounded w-12" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-9 bg-slate-200 rounded-lg w-24" />
        <div className="h-9 bg-slate-200 rounded-lg w-24" />
      </div>
    </div>
  );

  const renderProviderCard = () => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
      <div className="h-32 bg-slate-200" />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-slate-200 rounded-full -mt-8 border-4 border-white" />
          <div className="space-y-1">
            <div className="h-4 bg-slate-200 rounded w-24" />
            <div className="h-3 bg-slate-200 rounded w-16" />
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-3 bg-slate-200 rounded w-full" />
          <div className="h-3 bg-slate-200 rounded w-3/4" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 bg-slate-200 rounded-lg flex-1" />
          <div className="h-8 bg-slate-200 rounded-lg flex-1" />
        </div>
      </div>
    </div>
  );

  const skeletons = {
    card: renderCard,
    list: renderList,
    table: renderTable,
    stats: renderStats,
    text: renderText,
    avatar: renderAvatar,
    booking: renderBookingCard,
    provider: renderProviderCard
  };

  const SkeletonComponent = skeletons[type] || skeletons.card;
  // Rendered as a plain vertical stack rather than a grid.
  const stacked = type === 'list' || type === 'table' || type === 'text' || type === 'avatar';

  return (
    <div className={className}>
      {[...Array(count)].map((_, i) => (
        // `card` is always rendered inside a CSS grid by its callers, so an
        // extra bottom margin would fight the grid's own `gap` and leave rows
        // unevenly spaced. The stacked types keep the margin.
        <div key={i} className={stacked ? 'mb-4' : ''}>
          <SkeletonComponent />
        </div>
      ))}
    </div>
  );
}

export default SkeletonLoader;
