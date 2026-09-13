import {
  SEO_CITY_PAGE,
  SEO_INTENT_PAGES,
  SEO_SERVICE_PAGES,
  getIntentLanding,
  getServiceLanding,
} from './seoLandingPages.js';

export const HOME_SEO = {
  path: '/',
  title: 'ServeGo24 - Home Services in Hyderabad | Book Electrician, Plumber, AC Repair',
  description: 'Book verified electricians, plumbers, AC technicians, cleaners and more in Hyderabad. ServeGo24 connects you with trusted local professionals. Fast dispatch, transparent pricing.',
};

export const SERVICES_SEO = {
  path: '/services',
  title: 'Home Services in Hyderabad - Book Electrician, Plumber, AC Repair | ServeGo24',
  description: 'Browse and book verified home service professionals in Hyderabad. Electricians, plumbers, AC technicians, cleaners, carpenters and more. Transparent pricing and local availability.',
};

export const JOIN_PROVIDER_SEO = {
  path: '/join-as-provider',
  title: 'Join ServeGo24 as a Service Provider - Earn Locally in Hyderabad',
  description: 'Register as an electrician, plumber, AC technician, cleaner or other home-service professional on ServeGo24. Get local job leads, transparent earnings and flexible working hours.',
  faqs: [
    { q: 'How do I register as a service provider on ServeGo24?', a: 'Create an account, select your service category and submit your profile for review before accepting jobs.' },
    { q: 'What services can I offer on ServeGo24?', a: 'Electrician, plumbing, AC repair, cleaning, carpentry, painting, CCTV, appliance repair, RO service and other approved home services.' },
    { q: 'When do I get paid?', a: 'Provider earnings are settled according to the current platform payout schedule after completed jobs.' },
  ],
};

export const ABOUT_SEO = {
  path: '/about',
  title: 'About ServeGo24 - Verified Home Services Marketplace in Hyderabad',
  description: 'ServeGo24 is a Hyderabad-based home services marketplace connecting customers with verified electricians, plumbers, AC technicians and more. Learn about our mission and service model.',
};

export const CONTACT_SEO = {
  path: '/contact',
  title: 'Contact ServeGo24 - Customer Support & Service Enquiries',
  description: 'Need help with a booking, refund or provider registration? Contact ServeGo24 support in Hyderabad by phone or email.',
};

export const FAQ_SEO = {
  path: '/faq',
  title: 'Frequently Asked Questions - ServeGo24 Home Services',
  description: 'Find answers about booking home services, cancellations, payments, verification and joining ServeGo24 as a service provider.',
  faqs: [
    { q: 'How does ServeGo24 verification work?', a: 'Service professionals are reviewed through identity and service approval checks before they can take bookings.' },
    { q: 'Can I choose a service professional?', a: 'Available professionals and booking details depend on the service category, location and current availability.' },
    { q: 'How do I get help with a booking?', a: 'Contact ServeGo24 support with your booking details so the team can review the request and guide you.' },
  ],
};

export function getCitySeo(citySlug = 'hyderabad') {
  const cityName = citySlug === 'hyderabad'
    ? 'Hyderabad'
    : citySlug.replace(/-/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
  return {
    ...SEO_CITY_PAGE,
    path: `/cities/${citySlug}`,
    name: cityName,
    cityName,
    title: SEO_CITY_PAGE.title.replace('Hyderabad', cityName),
    description: SEO_CITY_PAGE.description.replace('Hyderabad', cityName),
    h1: SEO_CITY_PAGE.h1.replace('Hyderabad', cityName),
    intro: SEO_CITY_PAGE.intro.replace(/Hyderabad/g, cityName),
  };
}

export function getServiceSeo(slug, citySlug = 'hyderabad', routeType = 'service') {
  const service = getServiceLanding(slug);
  if (!service) return null;
  const cityName = getCitySeo(citySlug).name;
  const path = routeType === 'service' ? `/services/${slug}` : `/cities/${citySlug}/${slug}`;
  return {
    ...service,
    path,
    title: service.title.replace('Hyderabad', cityName),
    description: service.description.replace('Hyderabad', cityName),
    h1: service.h1.replace('Hyderabad', cityName),
    intro: service.intro.replace(/Hyderabad/g, cityName),
    cityName,
  };
}

export function getIntentSeo(slug, citySlug = 'hyderabad') {
  const intent = getIntentLanding(slug);
  if (!intent) return null;
  const cityName = getCitySeo(citySlug).name;
  return {
    ...intent,
    path: `/help/${slug}`,
    title: intent.title.replace(/Hyderabad/g, cityName),
    description: intent.description.replace(/Hyderabad/g, cityName),
    intro: intent.intro.replace(/Hyderabad/g, cityName),
    whenToBook: intent.whenToBook.replace(/Hyderabad/g, cityName),
    service: getServiceSeo(intent.serviceSlug, citySlug, 'service'),
    cityName,
  };
}

export function getPublicSeoRoute(pathname) {
  const path = pathname.replace(/\?.*$/, '').replace(/\/+$/, '') || '/';
  if (path === '/') return { kind: 'home', ...HOME_SEO };
  if (path === '/services') return { kind: 'services', ...SERVICES_SEO };
  if (path === '/join-as-provider') return { kind: 'join-provider', ...JOIN_PROVIDER_SEO };
  if (path === '/about') return { kind: 'about', ...ABOUT_SEO };
  if (path === '/contact') return { kind: 'contact', ...CONTACT_SEO };
  if (path === '/faq') return { kind: 'faq', ...FAQ_SEO };

  const serviceMatch = path.match(/^\/services\/([^/]+)$/);
  if (serviceMatch) {
    const seo = getServiceSeo(serviceMatch[1], 'hyderabad', 'service');
    return seo ? { kind: 'service', ...seo } : null;
  }

  const cityServiceMatch = path.match(/^\/cities\/([^/]+)\/([^/]+)$/);
  if (cityServiceMatch) {
    const seo = getServiceSeo(cityServiceMatch[2], cityServiceMatch[1], 'city');
    return seo ? { kind: 'city-service', ...seo } : null;
  }

  const cityMatch = path.match(/^\/cities\/([^/]+)$/);
  if (cityMatch) {
    const seo = getCitySeo(cityMatch[1]);
    return seo ? { kind: 'city', ...seo } : null;
  }

  const intentMatch = path.match(/^\/help\/([^/]+)$/);
  if (intentMatch) {
    const seo = getIntentSeo(intentMatch[1]);
    return seo ? { kind: 'intent', ...seo } : null;
  }

  return null;
}

export const PRERENDER_SERVICE_SLUGS = Object.keys(SEO_SERVICE_PAGES);
export const PRERENDER_INTENT_SLUGS = Object.keys(SEO_INTENT_PAGES);

export const PRERENDER_PATHS = [
  '/',
  '/services',
  '/cities/hyderabad',
  '/join-as-provider',
  '/about',
  '/contact',
  '/faq',
  ...PRERENDER_SERVICE_SLUGS.map((slug) => `/services/${slug}`),
  ...PRERENDER_SERVICE_SLUGS.map((slug) => `/cities/hyderabad/${slug}`),
  ...PRERENDER_INTENT_SLUGS.map((slug) => `/help/${slug}`),
];
