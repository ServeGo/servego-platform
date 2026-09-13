import { useEffect } from 'react';

const BASE_URL = 'https://servego24.com';
const DEFAULT_IMAGE = 'https://res.cloudinary.com/dal84gvkm/image/upload/v1789329501/servego/public/j47zqpnzglwwelwn9ugf.jpg';

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

/**
 * useSEO — call at the top of every public page component.
 *
 * @param {object} opts
 * @param {string} opts.title        - Full page <title>
 * @param {string} opts.description  - Meta description (≤160 chars)
 * @param {string} opts.path         - Canonical path, e.g. '/services'
 * @param {string} [opts.robots]     - 'index,follow' | 'noindex,nofollow'
 * @param {string} [opts.ogImage]    - Absolute image URL for OG/Twitter
 * @param {object} [opts.schema]     - JSON-LD structured data object
 */
export function useSEO({ title, description, path, robots = 'index,follow', ogImage, schema } = {}) {
  useEffect(() => {
    if (title) document.title = title;

    const canonicalUrl = `${BASE_URL}${path || '/'}`;
    const image = ogImage || DEFAULT_IMAGE;

    setMeta('description', description);
    setMeta('robots', robots);
    setCanonical(canonicalUrl);

    // Open Graph
    setMeta('og:title', title, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:url', canonicalUrl, 'property');
    setMeta('og:image', image, 'property');

    // Twitter
    setMeta('twitter:title', title, 'name');
    setMeta('twitter:description', description, 'name');
    setMeta('twitter:image', image, 'name');

    // JSON-LD structured data
    const schemaId = 'seo-schema-ld';
    let schemaEl = document.getElementById(schemaId);
    if (schema) {
      if (!schemaEl) {
        schemaEl = document.createElement('script');
        schemaEl.id = schemaId;
        schemaEl.type = 'application/ld+json';
        document.head.appendChild(schemaEl);
      }
      schemaEl.textContent = JSON.stringify(schema);
    } else if (schemaEl) {
      schemaEl.remove();
    }

    return () => {
      // Reset to noindex on unmount so private pages never accidentally stay indexed
    };
  }, [title, description, path, robots, ogImage, schema]);
}
