import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRERENDER_PATHS, getSeoMetadata } from '../src/data/seoData.js';
import { SEO_SERVICE_PAGES } from '../src/data/seoLandingPages.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.resolve(scriptDirectory, '..');
const distDirectory = path.join(frontendDirectory, 'dist');
const templatePath = path.join(distDirectory, 'index.html');
const baseUrl = 'https://servego24.com';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const absoluteUrl = (routePath) => `${baseUrl}${routePath === '/' ? '' : routePath}`;

function replaceMeta(html, selectorPattern, tag) {
  const pattern = new RegExp(`<meta[^>]+${selectorPattern}[^>]*>`, 'i');
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

function replaceTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
}

function buildHead(html, route) {
  const canonical = absoluteUrl(route.path);
  let output = replaceTitle(html, route.title);
  output = replaceMeta(output, 'name=["\\\']description["\\\']', `<meta name="description" content="${escapeHtml(route.description)}" />`);
  output = replaceMeta(output, 'name=["\\\']robots["\\\']', '<meta name="robots" content="index, follow" />');
  output = output.replace(/<link[^>]+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${canonical}" />`);
  output = output.replace(/<link[^>]+rel=["']alternate["'][^>]*hreflang=["']en-IN["'][^>]*>/i, `<link rel="alternate" hreflang="en-IN" href="${canonical}" />`);
  output = replaceMeta(output, 'property=["\\\']og:title["\\\']', `<meta property="og:title" content="${escapeHtml(route.title)}" />`);
  output = replaceMeta(output, 'property=["\\\']og:description["\\\']', `<meta property="og:description" content="${escapeHtml(route.description)}" />`);
  output = replaceMeta(output, 'property=["\\\']og:url["\\\']', `<meta property="og:url" content="${canonical}" />`);
  output = replaceMeta(output, 'name=["\\\']twitter:title["\\\']', `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`);
  output = replaceMeta(output, 'name=["\\\']twitter:description["\\\']', `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`);
  const imageAlt = `${route.title} – Book local home services on ServeGo24`;
  output = replaceMeta(output, 'property=["\\\']og:image:alt["\\\']', `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`);
  output = replaceMeta(output, 'name=["\\\']twitter:image:alt["\\\']', `<meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />`);
  return output;
}

function buildBreadcrumbs(route) {
  const items = [{ name: 'Home', path: '/' }];
  if (route.kind === 'service') items.push({ name: 'Services', path: '/services' }, { name: route.name, path: route.path });
  if (route.kind === 'city' || route.kind === 'city-service') items.push({ name: route.cityName, path: `/cities/${route.cityName.toLowerCase()}` });
  if (route.kind === 'city-service') items.push({ name: route.name, path: route.path });
  if (route.kind === 'intent') items.push({ name: route.service.name, path: `/services/${route.serviceSlug}` }, { name: route.h1, path: route.path });
  if (route.kind === 'join-provider') items.push({ name: 'Join as Provider', path: route.path });
  if (['about', 'contact', 'faq'].includes(route.kind)) items.push({ name: route.title.split(' - ')[0], path: route.path });
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

function buildFaqSchema(faqs = []) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };
}

function buildSchema(route) {
  const graph = [
    {
      '@type': route.kind === 'about' ? 'AboutPage' : (route.kind === 'contact' ? 'ContactPage' : 'WebPage'),
      '@id': `${absoluteUrl(route.path)}#webpage`,
      url: absoluteUrl(route.path),
      name: route.title,
      description: route.description,
      isPartOf: { '@id': `${baseUrl}/#website` },
    },
    buildBreadcrumbs(route),
  ];

  if (['service', 'city-service', 'intent'].includes(route.kind)) {
    const service = route.kind === 'intent' ? route.service : route;
    graph.push({
      '@type': service.serviceSchema || 'Service',
      '@id': `${absoluteUrl(route.path)}#service`,
      name: service.name,
      description: service.description,
      provider: { '@type': 'Organization', '@id': `${baseUrl}/#organization`, name: 'ServeGo24' },
      areaServed: { '@type': 'City', name: route.cityName || 'Hyderabad' },
      url: absoluteUrl(route.path),
    });
  }

  if (route.kind === 'city') {
    graph.push({
      '@type': 'ItemList',
      name: `Home Services in ${route.cityName}`,
      description: route.description,
      url: absoluteUrl(route.path),
      itemListElement: Object.entries(SEO_SERVICE_PAGES).map(([slug, service], index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: service.name,
        url: absoluteUrl(`/cities/${route.cityName.toLowerCase()}/${slug}`),
      })),
    });
  }

  if (route.faqs?.length) graph.push(buildFaqSchema(route.faqs));
  return { '@context': 'https://schema.org', '@graph': graph };
}

function linkList(links) {
  return `<ul>${links.map(({ label, path: linkPath }) => `<li><a href="${escapeHtml(linkPath)}">${escapeHtml(label)}</a></li>`).join('')}</ul>`;
}

function renderStaticContent(route) {
  if (route.kind === 'home') {
    return `<h1>${escapeHtml(route.title.split(' | ')[0])}</h1><p>${escapeHtml(route.description)}</p><h2>Popular services in Hyderabad</h2>${linkList(Object.entries(SEO_SERVICE_PAGES).slice(0, 3).map(([slug, service]) => ({ label: service.name, path: `/cities/hyderabad/${slug}` })))}<p><a href="/services">Browse all services</a></p>`;
  }

  if (route.kind === 'services') {
    return `<h1>Home Services in Hyderabad</h1><p>${escapeHtml(route.description)}</p><h2>Choose a service</h2>${linkList(Object.entries(SEO_SERVICE_PAGES).map(([slug, service]) => ({ label: service.name, path: `/services/${slug}` })))}`;
  }

  if (route.kind === 'join-provider') {
    return `<h1>Join ServeGo24 as a Service Provider</h1><p>${escapeHtml(route.description)}</p><h2>How provider registration works</h2><ol><li>Create your professional account.</li><li>Select your services and working area.</li><li>Submit your profile for review.</li><li>Accept suitable local job leads after approval.</li></ol><p><a href="/signup">Register as a provider</a></p>${renderFaqs(route.faqs)}`;
  }

  if (route.kind === 'about') {
    return `<h1>About ServeGo24</h1><p>${escapeHtml(route.description)}</p><h2>Our service model</h2><p>ServeGo24 connects customers with local service professionals for practical household work, with a booking flow that captures the requirement, location and service details.</p><p><a href="/services">Explore home services</a></p>`;
  }

  if (route.kind === 'contact') {
    return `<h1>Contact ServeGo24</h1><p>${escapeHtml(route.description)}</p><h2>Customer support</h2><p>For booking and service enquiries, call <a href="tel:18004102026">1800-410-2026</a> or email <a href="mailto:support@servego.com">support@servego.com</a>.</p><p><a href="/faq">Read frequently asked questions</a></p>`;
  }

  if (route.kind === 'faq') {
    return `<h1>Frequently Asked Questions</h1><p>${escapeHtml(route.description)}</p>${renderFaqs(route.faqs)}<p><a href="/services">Browse services</a> | <a href="/contact">Contact support</a></p>`;
  }

  if (route.kind === 'city') {
    return `<h1>${escapeHtml(route.h1)}</h1><p>${escapeHtml(route.intro)}</p><h2>Services available in ${escapeHtml(route.cityName)}</h2>${linkList(Object.entries(SEO_SERVICE_PAGES).map(([slug, service]) => ({ label: service.name, path: `/cities/${route.cityName.toLowerCase()}/${slug}` })))}${renderFaqs(route.faqs)}`;
  }

  if (route.kind === 'intent') {
    return `<h1>${escapeHtml(route.h1)}</h1><p>${escapeHtml(route.intro)}</p><h2>What you may notice</h2>${linkList(route.symptoms.map((symptom) => ({ label: symptom, path: route.path })))}<h2>What to do first</h2><ul>${route.whatToDo.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ul><h2>When to request ${escapeHtml(route.service.shortName.toLowerCase())} help</h2><p>${escapeHtml(route.whenToBook)}</p><p><a href="/services/${route.serviceSlug}">View ${escapeHtml(route.service.shortName)} service</a> | <a href="/cities/hyderabad/${route.serviceSlug}">${escapeHtml(route.service.shortName)} in Hyderabad</a></p>${renderFaqs(route.faqs)}`;
  }

  return `<h1>${escapeHtml(route.h1)}</h1><p>${escapeHtml(route.intro)}</p><h2>What this service includes</h2><ul>${(route.included || route.problems || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul><h2>Local guidance for ${escapeHtml(route.cityName)}</h2><p>${escapeHtml(route.localContext || '')}</p><h2>What affects the price?</h2><p>${escapeHtml(route.priceFactors || 'The final cost depends on the job scope, access, labour time and any replacement materials. Confirm the scope and price before work begins.')}</p>${renderFaqs(route.faqs)}<p><a href="/services">Request a service</a></p>`;
}

function renderFaqs(faqs = []) {
  if (!faqs.length) return '';
  return `<h2>Frequently asked questions</h2><dl>${faqs.map((faq) => `<dt>${escapeHtml(faq.q)}</dt><dd>${escapeHtml(faq.a)}</dd>`).join('')}</dl>`;
}

function buildDocument(template, route) {
  const schema = JSON.stringify({ '@context': 'https://schema.org', '@graph': route.jsonLd }).replaceAll('<', '\\u003c');
  const staticContent = `<div id="seo-static-content" data-prerendered="true" style="max-width:960px;margin:0 auto;padding:32px 20px;font-family:system-ui,sans-serif;line-height:1.6;color:#0f172a"><p style="font-size:12px;color:#0f766e;font-weight:700;text-transform:uppercase;letter-spacing:.12em">ServeGo24</p>${renderStaticContent(route)}</div>`;
  let html = buildHead(template, route);
  html = html.replace(/<noscript>[\s\S]*?<\/noscript>/i, '');
  html = html.replace('</head>', `    <script type="application/ld+json" data-prerendered-schema>${schema}</script>\n  </head>`);
  html = html.replace('<div id="root"></div>', `${staticContent}<div id="root"></div>`);
  return html;
}

const template = await fs.readFile(templatePath, 'utf8');
for (const routePath of PRERENDER_PATHS) {
  const route = getSeoMetadata(routePath);
  if (!route) throw new Error(`No SEO route data for ${routePath}`);
  const outputDirectory = path.join(distDirectory, routePath === '/' ? '' : routePath.slice(1));
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(path.join(outputDirectory, 'index.html'), buildDocument(template, route), 'utf8');
}

console.log(`Prerendered ${PRERENDER_PATHS.length} public SEO routes.`);
