import {
  HOME_SEO,
  SERVICES_SEO,
  JOIN_PROVIDER_SEO,
  ABOUT_SEO,
  CONTACT_SEO,
  FAQ_SEO,
  PRERENDER_PATHS,
  getPublicSeoRoute,
} from './seoRoutes.js';
import { SEO_SERVICE_PAGES } from './seoLandingPages.js';

const BASE_URL = 'https://servego24.com';

const absoluteUrl = (path) => `${BASE_URL}${path === '/' ? '' : path}`;

function breadcrumbs(route) {
  const items = [{ name: 'Home', path: '/' }];
  if (route.kind === 'service') items.push({ name: 'Services', path: '/services' }, { name: route.name, path: route.path });
  if (route.kind === 'city') items.push({ name: route.cityName, path: route.path });
  if (route.kind === 'city-service') items.push({ name: route.cityName, path: `/cities/${route.cityName.toLowerCase()}` }, { name: route.name, path: route.path });
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

function faqSchema(faqs = []) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };
}

function buildJsonLd(route) {
  const graph = [
    {
      '@type': route.kind === 'about' ? 'AboutPage' : (route.kind === 'contact' ? 'ContactPage' : 'WebPage'),
      '@id': `${absoluteUrl(route.path)}#webpage`,
      url: absoluteUrl(route.path),
      name: route.title,
      description: route.description,
      isPartOf: { '@id': `${BASE_URL}/#website` },
    },
    breadcrumbs(route),
  ];

  if (['service', 'city-service', 'intent'].includes(route.kind)) {
    const service = route.kind === 'intent' ? route.service : route;
    graph.push({
      '@type': service.serviceSchema || 'Service',
      '@id': `${absoluteUrl(route.path)}#service`,
      name: service.name,
      description: service.description,
      provider: { '@type': 'Organization', '@id': `${BASE_URL}/#organization`, name: 'ServeGo24' },
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

  if (route.faqs?.length) graph.push(faqSchema(route.faqs));
  return graph;
}

export function getSeoMetadata(pathname) {
  const route = getPublicSeoRoute(pathname);
  if (!route) return null;

  return {
    ...route,
    canonical: absoluteUrl(route.path),
    ogTitle: route.title,
    ogDescription: route.description,
    jsonLd: buildJsonLd(route),
  };
}

export const SEO_ROUTE_REGISTRY = {
  home: HOME_SEO.path,
  services: SERVICES_SEO.path,
  joinProvider: JOIN_PROVIDER_SEO.path,
  about: ABOUT_SEO.path,
  contact: CONTACT_SEO.path,
  faq: FAQ_SEO.path,
  publicPaths: PRERENDER_PATHS,
};

export { PRERENDER_PATHS };
