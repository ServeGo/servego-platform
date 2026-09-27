import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './tailwind-dist.css';
import { initAnalytics } from './utils/analytics';

/**
 * Open the connection to the API origin before the first request needs it.
 * See the call site below for why this is on the critical path.
 */
function preconnectApi() {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) return;
  try {
    const origin = new URL(apiUrl, window.location.href).origin;
    // Same-origin (or a dev proxy) needs no extra connection — the document's own
    // connection is already warm.
    if (origin === window.location.origin) return;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    // The catalog GET is a plain CORS request; opening the connection with
    // crossorigin avoids a second, separate socket for the (credentialed) API calls.
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  } catch {
    // A malformed VITE_API_URL is surfaced loudly by apiClient; never block boot on it.
  }
}

// Chrome DevTools hot-injects a Web Vitals instrumentation shim into the
// running bundle (GoogleChrome/web-vitals#274, Angular#70464). While the
// Performance panel is recording it can throw
// "Cannot read properties of undefined (reading 'startTime')" from that
// injected `reportAllChanges` frame — a tooling bug, not an app error. This
// suppresses exactly that single known frame; every other uncaught error still
// propagates and hits the global handler.
window.addEventListener(
  'error',
  (event) => {
    const message = event?.message || '';
    const stack = event?.error?.stack || '';
    if (message.includes("reading 'startTime'") && /reportAllChanges/i.test(stack)) {
      event.preventDefault();
    }
  },
  true
);

  // Public SEO routes may contain a build-time HTML shell. The SPA owns the
  // interactive root after startup, so remove that static shell first.
  document.getElementById('seo-static-content')?.remove();
  // The prerender also injects a static JSON-LD graph into <head>; the useSEO
  // hook re-injects client-side schemas when the page mounts, so drop the
  // static copy to avoid duplicate structured data in the DOM.
  document.querySelectorAll('script[data-prerendered-schema]').forEach((el) => el.remove());

  // The backend is a different origin from the site (`VITE_API_URL` points at the
  // deployed API), so every cold visit paid a full DNS + TCP + TLS handshake before
  // the first byte of `GET /services` — the request behind the hero's category grid.
  // Registering the connection here, at module scope and therefore before any
  // component mounts, overlaps that handshake with the rest of the boot instead of
  // putting it in front of the catalog. A no-op when the API is same-origin.
  preconnectApi();

  // The home page is behind React.lazy, so its chunk only started downloading after
  // the auth gate cleared and React committed — two spinners deep, with the hero
  // (the LCP element) blocked behind it. Kicking the dynamic import off here starts
  // that download in parallel with the rest of the boot. It stays a separate chunk
  // and stays lazy; this only moves *when* the fetch begins, which is the difference
  // between the chunk arriving during boot and after it.
  import('./pages/Home.jsx').catch(() => {
    // Offline or chunk-load failure: App's own lazy import surfaces the real error.
  });

  // The gtag.js base tag is in index.html, so it is already live by this point.
  // This only adds per-navigation page_views, which gtag.js cannot infer in an
  // SPA. No-ops when VITE_GA_ID is empty (local/testing).
  initAnalytics();

  createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

