import { useEffect } from 'react';
import { DEFAULT_SEO_IMAGE as DEFAULT_IMAGE } from '../data/websiteImages';

export const BASE_URL = 'https://servego24.com';
const DEFAULT_IMAGE_WIDTH = '1200';
const DEFAULT_IMAGE_HEIGHT = '630';

function setMeta(name, content, attr = 'name') {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(url) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

function removeSchemas() {
  // Client-injected schemas
  document.querySelectorAll('script[data-seo-schema]').forEach((el) => el.remove());
  // Build-time prerendered schemas (avoids duplicate JSON-LD after hydration)
  document.querySelectorAll('script[data-prerendered-schema]').forEach((el) => el.remove());
}

function injectSchema(payload) {
  const el = document.createElement('script');
  el.type = 'application/ld+json';
  el.setAttribute('data-seo-schema', 'true');
  el.textContent = JSON.stringify(payload);
  document.head.appendChild(el);
}

function setHrefLang(url) {
  let el = document.querySelector('link[hreflang="en-IN"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'alternate');
    el.setAttribute('hreflang', 'en-IN');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

/**
 * useSEO — call at the top of every public page component.
 *
 * @param {object} opts
 * @param {string}        opts.title          - Full page <title>
 * @param {string}        opts.description    - Meta description (≤160 chars)
 * @param {string}        opts.path           - Canonical path, e.g. '/services'
 * @param {string}        [opts.robots]       - 'index,follow' | 'noindex,nofollow'
 * @param {string}        [opts.ogImage]      - Absolute image URL for OG/Twitter
 * @param {string}        [opts.ogImageAlt]   - Descriptive alt text for OG/Twitter image
 * @param {string}        [opts.ogType]       - OG type, default 'website'
 * @param {object|object[]} [opts.schema]     - JSON-LD structured data (single or array)
 */
export function useSEO({ title, description, path, robots = 'index,follow', ogImage, ogImageAlt, ogType = 'website', schema } = {}) {
  useEffect(() => {
    if (title) document.title = title;

    const canonicalPath = path ? `/${path.replace(/^\/+|\/+$/g, '')}` : '/';
    // Homepage canonical is the bare domain (no trailing slash)
    const canonicalUrl = canonicalPath === '/' ? BASE_URL : `${BASE_URL}${canonicalPath}`;
    const image = ogImage || DEFAULT_IMAGE;
    const imageAltText = ogImageAlt || title;

    setMeta('description', description);
    setMeta('robots', robots);
    setCanonical(canonicalUrl);
    setHrefLang(canonicalUrl);

    // Open Graph
    setMeta('og:type', ogType, 'property');
    setMeta('og:title', title, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:url', canonicalUrl, 'property');
    setMeta('og:image', image, 'property');
    setMeta('og:image:width', DEFAULT_IMAGE_WIDTH, 'property');
    setMeta('og:image:height', DEFAULT_IMAGE_HEIGHT, 'property');
    setMeta('og:image:alt', imageAltText, 'property');

    // Twitter / X
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', image);
    setMeta('twitter:image:alt', imageAltText);

    // JSON-LD — remove previous page schemas, inject fresh ones.
    // Supports a single schema object, an array of schema objects, or
    // an object with '@graph' (passed through as-is).
    removeSchemas();
    if (schema) {
      if (Array.isArray(schema)) {
        // Wrap in a single @graph document for clean JSON-LD
        injectSchema({ '@context': 'https://schema.org', '@graph': schema });
      } else {
        // Single schema object — ensure @context is present
        const payload = schema['@context'] ? schema : { '@context': 'https://schema.org', ...schema };
        injectSchema(payload);
      }
    }

    return () => {
      removeSchemas();
    };
  }, [title, description, path, robots, ogImage, ogImageAlt, ogType, schema]);
}
