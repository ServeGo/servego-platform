import fs from 'node:fs/promises';

const baseUrl = process.env.SEO_BASE_URL || 'http://127.0.0.1:4174';
const sitemapFiles = [
  'public/sitemap-pages.xml',
  'public/sitemap-cities.xml',
  'public/sitemap-service-cities.xml',
];

const metaContent = (html, name) => html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'))?.[1] || '';
const canonicalHref = (html) => html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] || '';
const titleText = (html) => html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '';
const h1Text = (html) => html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]+>/g, '').trim() || '';
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const sitemapUrls = [];
for (const file of sitemapFiles) {
  const xml = await fs.readFile(file, 'utf8');
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) sitemapUrls.push(match[1]);
}

let failures = 0;
for (const sitemapUrl of sitemapUrls) {
  const route = new URL(sitemapUrl).pathname;
  const expectedCanonical = `https://servego24.com${route === '/' ? '' : route}`;
  try {
    const response = await fetch(`${baseUrl}${route}`);
    const html = await response.text();
    const title = titleText(html);
    const robots = metaContent(html, 'robots').toLowerCase();
    assert(response.status === 200, `status ${response.status}`);
    assert(title, 'missing title');
    assert(canonicalHref(html) === expectedCanonical, `canonical ${canonicalHref(html)}`);
    assert(!robots.includes('noindex'), `robots ${robots}`);
    assert(h1Text(html), 'missing H1');
    assert(html.includes('application/ld+json'), 'missing JSON-LD');
    console.log(`PASS ${route}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${route}: ${error.message}`);
  }
}

if (failures) process.exit(1);
console.log(`Validated ${sitemapUrls.length} sitemap URLs.`);
