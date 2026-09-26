import React, { useMemo } from 'react';
import { ArrowRight, Star, Users } from 'lucide-react';
import CategoryIcon from './CategoryIcon';

/**
 * Service category card.
 *
 * The whole card is the tap target rather than a button sitting inside it:
 * that gives one focusable element, one large hit area (it has to work on
 * phones), and removes the heavy full-width button that used to sit under
 * every card in the grid.
 *
 * Everything rendered here already comes from `GET /services` — `avgRating`,
 * `activeSpecialistCount` and `popularIssues` were all being sent to the client
 * and thrown away.
 */

/** `popularIssues` is a Prisma Json column: entries may be strings or objects. */
function issueLabel(raw) {
  if (typeof raw === 'string') return raw.trim();
  if (raw && typeof raw === 'object') {
    const value = raw.label || raw.name || raw.title || raw.issue || raw.issueName;
    return typeof value === 'string' ? value.trim() : '';
  }
  return '';
}

export default function ServiceCard({
  category,
  providers,
  onSelect,
}) {
  const safeProviders = Array.isArray(providers) ? providers : [];

  const activeCount = useMemo(() => {
    if (typeof category.activeSpecialistCount === 'number') return category.activeSpecialistCount;
    return safeProviders.filter(
      (p) => (p.category || '').toLowerCase() === (category.name || '').toLowerCase() && p.isVerified
    ).length;
  }, [category.activeSpecialistCount, category.name, safeProviders]);

  // De-duplicated on purpose: `popularIssues` is free-form Prisma Json, so the
  // same label can legitimately arrive twice ("Leak repair" and "leak repair").
  // Identical `key` values in that list would break React's reconciliation.
  const issues = useMemo(
    () => [...new Set(
      (Array.isArray(category.popularIssues) ? category.popularIssues : [])
        .map(issueLabel)
        .filter(Boolean)
    )].slice(0, 3),
    [category.popularIssues]
  );

  // The API sends 0 when a category has no reviews yet. "0.0" reads as a
  // genuine score, so treat anything below one review as unrated.
  const avgRating = Number(category.avgRating) || 0;
  const isRated = avgRating > 0;

  const selectKey = category.id || category.name;
  const interactive = typeof onSelect === 'function';

  // The heading stays a real <h3> for screen readers, and the button inside it
  // stretches a transparent ::after across the whole card. That gives one
  // focusable element, a full-card tap target, and valid HTML — a <button> may
  // only contain phrasing content, so a heading cannot sit inside one.
  const heading = (
    <h3 className="text-[15px] sm:text-base font-extrabold text-slate-900 tracking-tight leading-snug line-clamp-2">
      {interactive ? (
        <button
          type="button"
          onClick={() => onSelect(selectKey)}
          aria-label={`Book ${category.name}`}
          className="text-left after:absolute after:inset-0 after:content-[''] focus:outline-none rounded-sm"
        >
          {category.name}
        </button>
      ) : (
        category.name
      )}
    </h3>
  );

  return (
    <article
      className={`group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-teal-500 focus-within:ring-offset-2 ${interactive ? 'cursor-pointer' : ''}`}
    >
      <div className="relative h-36 sm:h-40 shrink-0 overflow-hidden bg-gradient-to-br from-teal-500/15 to-indigo-500/15">
        {category.image ? (
          <img
            src={category.image}
            alt=""
            // The card reserves a fixed height, so lazy-loading plus
            // off-main-thread decoding keeps a six-card grid from blocking
            // first paint on six Cloudinary fetches. `alt=""` because the name
            // is already the adjacent heading.
            loading="lazy"
            decoding="async"
            // object-cover: the image fills the media band edge to edge. The
            // band has a fixed height, so the top and bottom of the box are
            // what we crop, and service photos are centre-weighted.
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-teal-700">
            <CategoryIcon name={category.name} className="w-12 h-12 sm:w-14 sm:h-14" />
          </div>
        )}

        {/* Darken only the lower third so the rating pill stays legible. */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-slate-950/15 pointer-events-none" />

        {isRated && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-extrabold text-slate-900 shadow-sm">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" aria-hidden="true" />
            {avgRating.toFixed(1)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* No `capitalize`: CSS capitalize lowercases the tail of every word, so
            "AC Repair" and "R.O. Service" were rendering as "Ac Repair". The
            name is already stored correctly cased. */}
        {heading}

        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          {activeCount > 0 ? (
            <>
              <Users className="w-3.5 h-3.5 shrink-0 text-teal-600" aria-hidden="true" />
              {activeCount} {activeCount === 1 ? 'specialist' : 'specialists'} available
            </>
          ) : (
            <span className="text-slate-400">No specialists listed yet</span>
          )}
        </p>

        {category.description && (
          <p className="mt-2 line-clamp-2 text-xs text-slate-500 font-medium leading-relaxed">
            {category.description}
          </p>
        )}

        {issues.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {issues.map((issue) => (
              <li
                key={issue}
                className="max-w-full truncate rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"
              >
                {issue}
              </li>
            ))}
          </ul>
        )}

        {/* Left-aligned CTA, pinned to the bottom of the flex column by mt-auto so
            every CTA in a row sits on the same line regardless of description or
            chip length. Padding supplies the gap from the content above — `mt-4`
            would leave ragged bottoms. */}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-extrabold text-teal-700 transition-colors group-hover:text-teal-900">
          Book now
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}
