import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './tailwind-dist.css';
import { initAnalytics } from './utils/analytics';

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

  // The gtag.js base tag is in index.html, so it is already live by this point.
  // This only adds per-navigation page_views, which gtag.js cannot infer in an
  // SPA. No-ops when VITE_GA_ID is empty (local/testing).
  initAnalytics();

  createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

