/**
 * Google Analytics 4 page-view tracking for the ServeGo24 single-page app.
 *
 * The gtag.js base tag lives in `frontend/index.html` (see the comment there):
 * that is the only HTML entry, and `scripts/prerender-seo.mjs` derives every
 * prerendered SEO page from it, so the tag itself is already on every page.
 *
 * What this module adds is the part gtag.js cannot do on its own. gtag.js
 * sends exactly one automatic page_view per *document load*. ServeGo is an SPA:
 * the URL changes through `history.pushState` / `history.replaceState`, which
 * fire no event, so browsing home -> services -> electrician -> dashboard would
 * be recorded as a single page view and per-page analytics would be wrong.
 *
 * So: keep the automatic first page_view (it still fires without JavaScript,
 * e.g. on a crawler or a cached prerender), and send one explicit page_view per
 * subsequent navigation from here.
 */

const GA_ID = import.meta.env.VITE_GA_ID || '';

/** Analytics is off in local/testing builds, where VITE_GA_ID is empty. */
export const isAnalyticsEnabled = Boolean(GA_ID) && !GA_ID.includes('%');

// Internal event name; namespaced so it cannot collide with anything else.
const ROUTE_EVENT = 'servego:routechange';

let installed = false;

/** Path already reported, so a route is never counted twice. */
let lastTrackedPath = null;

function gtag(...args) {
  // `window.gtag` is installed by the inline script in index.html. It is absent
  // in local/testing builds, which is exactly when this module no-ops.
  if (typeof window.gtag === 'function') window.gtag(...args);
}

/**
 * Report the current page as a page_view. Safe to call on every render; repeats
 * for a path that has already been reported are ignored.
 */
export function trackPageView() {
  if (!isAnalyticsEnabled) return;

  // Compared on pathname only, deliberately. Services.jsx rewrites the query
  // string on every debounced keystroke, so keying on the full URL would fire a
  // page_view per character typed and inflate the metric. A path change is a
  // real navigation; a query-only change is not.
  const { pathname, href } = window.location;
  if (pathname === lastTrackedPath) return;
  lastTrackedPath = pathname;

  gtag('event', 'page_view', {
    // `send_to` pins the hit to this property, which matters if the tag is ever
    // initialised with more than one measurement ID.
    send_to: GA_ID,
    page_location: href,
    // useSEO sets document.title in an effect during the commit that renders
    // the new page, so this is read after React has rendered.
    page_title: document.title,
  });
}

/**
 * `useSEO` runs on every public page and dashboard. The router events already
 * cover those, but a page that skips `useSEO` (e.g. /customer-home) would
 * otherwise report whatever title the previous page left behind.
 */
function schedulePageView() {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(trackPageView);
  else setTimeout(trackPageView, 0);
}

/**
 * Broadcast a route change. `pushState`/`replaceState` emit no event of their
 * own, and ServeGo calls them from five places (App.updateBrowserRoute,
 * Navbar, Home, ServiceLanding, Services), so both are wrapped rather than
 * relying on a `popstate` listener, which only covers browser back/forward.
 */
function emitRouteChange() {
  window.dispatchEvent(new Event(ROUTE_EVENT));
  schedulePageView();
}

function patchHistoryMethod(method) {
  const original = window.history[method];
  if (typeof original !== 'function' || original.__servegoPatched) return;

  const patched = function (...args) {
    const result = original.apply(this, args);
    emitRouteChange();
    return result;
  };
  patched.__servegoPatched = true;
  window.history[method] = patched;
}

/**
 * Install SPA page-view tracking. Idempotent. Call once, before React renders.
 */
export function initAnalytics() {
  if (installed) return;
  installed = true;

  // gtag.js already sent the page_view for this document load, so seed the
  // watermark with the current path and only report genuine navigations.
  lastTrackedPath = window.location.pathname;

  if (!isAnalyticsEnabled) return;

  patchHistoryMethod('pushState');
  patchHistoryMethod('replaceState');

  // Browser back/forward buttons.
  window.addEventListener('popstate', emitRouteChange);
}
