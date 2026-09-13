import React from 'react';
import { ArrowRight, CheckCircle2, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { SEO_CITY_PAGE, getIntentLanding, getServiceLanding, SEO_SERVICE_PAGES, SERVICE_SLUGS } from '../data/seoLandingPages';
import { getCitySeo, getIntentSeo, getServiceSeo } from '../data/seoRoutes';

const BASE_URL = 'https://servego24.com';

function buildBreadcrumbs(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.path}`,
    })),
  };
}

function buildServiceSchema(service, path, cityName = 'Hyderabad') {
  return {
    '@type': 'Service',
    '@id': `${BASE_URL}${path}#service`,
    name: service.name,
    description: service.description,
    provider: {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'ServeGo24',
    },
    areaServed: { '@type': 'City', name: cityName, '@id': 'https://www.wikidata.org/wiki/Q1361' },
    url: `${BASE_URL}${path}`,
  };
}

function buildFAQSchema(faqs) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

function FAQItem({ faq, index }) {
  const [open, setOpen] = React.useState(index === 0);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors"
        aria-expanded={open}
      >
        <span>{faq.q}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-teal-600" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm leading-7 text-slate-600 border-t border-slate-100 pt-3 bg-slate-50/50">
          {faq.a}
        </div>
      )}
    </div>
  );
}

export function ServiceLanding({ slug, intentSlug, citySlug = 'hyderabad', routeType = 'city', onNavigate }) {
  const intent = getIntentLanding(intentSlug);
  const service = getServiceLanding(intent?.serviceSlug || slug);
  const cityName = citySlug === 'hyderabad' ? 'Hyderabad' : citySlug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  const city = { ...SEO_CITY_PAGE, slug: citySlug, name: cityName };
  const isIntentPage = Boolean(intent);
  const isCityPage = !service && !isIntentPage;
  const servicePath = routeType === 'service' ? `/services/${slug}` : `/cities/${citySlug}/${slug}`;
  const path = isIntentPage ? `/help/${intentSlug}` : (isCityPage ? `/cities/${citySlug}` : servicePath);
  const routeSeo = isIntentPage
    ? getIntentSeo(intentSlug, citySlug)
    : (isCityPage ? getCitySeo(citySlug) : getServiceSeo(slug, citySlug, routeType === 'service' ? 'service' : 'city'));
  const title = routeSeo?.title || (isCityPage ? `${city.name} Home Services - Book Local Professionals | ServeGo24` : service.title.replace('Hyderabad', cityName));
  const description = routeSeo?.description || (isCityPage ? city.description.replace('Hyderabad', cityName) : service.description.replace('Hyderabad', cityName));
  const faqs = isIntentPage ? intent.faqs : (isCityPage ? city.faqs : service.faqs);

  const schema = [
    {
      '@type': 'WebPage',
      '@id': `${BASE_URL}${path}#webpage`,
      url: `${BASE_URL}${path}`,
      name: title,
      description,
      isPartOf: { '@id': `${BASE_URL}/#website` },
    },
    buildBreadcrumbs([
      { name: 'Home', path: '/' },
      ...(isIntentPage
        ? [{ name: service.name, path: `/services/${intent.serviceSlug}` }, { name: intent.h1, path }]
        : (routeType === 'service' ? [{ name: 'Services', path: '/services' }] : [{ name: cityName, path: `/cities/${citySlug}` }])),
      ...(!isCityPage && !isIntentPage ? [{ name: service.name, path }] : []),
    ]),
    ...(isCityPage
      ? [
          {
            '@type': 'ItemList',
            name: `Home Services in ${cityName}`,
            description: city.description,
            url: `${BASE_URL}/cities/${citySlug}`,
            itemListElement: SERVICE_SLUGS.map((serviceSlug, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: SEO_SERVICE_PAGES[serviceSlug].name,
              url: `${BASE_URL}/cities/${citySlug}/${serviceSlug}`,
            })),
          },
        ]
      : [buildServiceSchema(service, path, cityName)]),
    ...(faqs && faqs.length ? [buildFAQSchema(faqs)] : []),
  ];

  useSEO({ title, description, path, schema });

  const relatedServices = isCityPage
    ? SERVICE_SLUGS.slice(0, 6).map((s) => [s, SEO_SERVICE_PAGES[s]])
    : service.related
        .map((relatedSlug) => [relatedSlug, SEO_SERVICE_PAGES[relatedSlug]])
        .filter(([, item]) => item);

  const navigateToServiceCity = (serviceSlug) => {
    const href = routeType === 'service' || isIntentPage ? `/services/${serviceSlug}` : `/cities/${citySlug}/${serviceSlug}`;
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8 text-xs font-semibold text-slate-500">
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li>
              <a
                href="/"
                onClick={(e) => { e.preventDefault(); onNavigate('home'); }}
                className="hover:text-teal-700 transition-colors"
              >
                Home
              </a>
            </li>
            <li aria-hidden="true" className="text-slate-300">/</li>
            <li>
              <a
                href={isIntentPage ? `/services/${intent.serviceSlug}` : `/cities/${citySlug}`}
                onClick={(e) => {
                  e.preventDefault();
                  const href = isIntentPage ? `/services/${intent.serviceSlug}` : `/cities/${citySlug}`;
                  window.history.pushState({}, '', href);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className={isCityPage ? 'text-slate-700' : 'hover:text-teal-700 transition-colors'}
                aria-current={isCityPage ? 'page' : undefined}
              >
                {isIntentPage ? service.shortName : cityName}
              </a>
            </li>
            {!isCityPage && !isIntentPage && (
              <>
                <li aria-hidden="true" className="text-slate-300">/</li>
                <li className="text-slate-700" aria-current="page">{service.shortName}</li>
              </>
            )}
          </ol>
        </nav>

        {/* Hero section */}
        <section className="rounded-2xl bg-slate-950 px-6 py-10 text-white sm:px-10">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-300">
            <MapPin className="h-4 w-4" aria-hidden="true" /> {cityName}
          </p>
          <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
            {isIntentPage ? intent.h1 : (isCityPage ? city.h1 : service.h1)}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            {isIntentPage ? intent.intro : (isCityPage ? city.intro : service.intro)}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('services')}
            className="mt-7 inline-flex items-center gap-2 rounded-lg bg-teal-500 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-teal-400 transition-colors"
          >
            Request a Service <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>

        {isIntentPage && (
          <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <h2 className="text-2xl font-black text-slate-900">What you may notice</h2>
              <ul className="mt-5 space-y-3" role="list">
                {intent.symptoms.map((symptom) => (
                  <li key={symptom} className="flex gap-3 text-sm leading-6 text-slate-700">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
                    {symptom}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-l border-slate-200 pl-6">
              <h2 className="text-2xl font-black text-slate-900">What to do first</h2>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
                {intent.whatToDo.map((step) => <li key={step}>{step}</li>)}
              </ul>
            </div>
          </section>
        )}

        {isIntentPage && (
          <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5">
            <h2 className="text-lg font-black text-slate-900">When to request {service.shortName.toLowerCase()} help</h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">{intent.whenToBook}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={`/services/${intent.serviceSlug}`} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-slate-700">View {service.shortName} service <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
              <a href={`/cities/${citySlug}/${intent.serviceSlug}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-800 hover:border-teal-500 hover:text-teal-700">{service.shortName} in {cityName}</a>
            </div>
          </section>
        )}

        {/* Service problems / city intro */}
        {isCityPage ? (
          <section className="mt-10">
            <h2 className="text-2xl font-black text-slate-900">Services available in {cityName}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Start with a service category, then share your location and requirements. Availability can vary by area and time.
            </p>
          </section>
        ) : (
          <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Common problems we help with</h2>
              <ul className="mt-5 space-y-3" role="list">
                {service.problems.map((problem) => (
                  <li key={problem} className="flex gap-3 text-sm leading-6 text-slate-700">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
                    {problem}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-l border-slate-200 pl-6">
              <h2 className="text-2xl font-black text-slate-900">How booking works</h2>
              <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600 list-none">
                <li className="flex gap-2"><span className="font-bold text-teal-600 shrink-0">1.</span> Tell us what is wrong and where you are in {cityName}.</li>
                <li className="flex gap-2"><span className="font-bold text-teal-600 shrink-0">2.</span> ServeGo24 matches you with an available local professional.</li>
                <li className="flex gap-2"><span className="font-bold text-teal-600 shrink-0">3.</span> Confirm the work scope, timing and pricing before the visit.</li>
                <li className="flex gap-2"><span className="font-bold text-teal-600 shrink-0">4.</span> Get the job done and pay once you are satisfied.</li>
              </ol>
            </div>
          </section>
        )}

        {!isCityPage && !isIntentPage && (
          <>
            <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-2xl font-black text-slate-900">Local guidance for {cityName}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{service.localContext || `Describe the property, the affected area and the time you need ${service.shortName.toLowerCase()} help. Availability depends on the service category and active professionals nearby.`}</p>
            </section>
            <section className="mt-10 grid gap-8 lg:grid-cols-2">
              <div>
                <h2 className="text-2xl font-black text-slate-900">What this service can include</h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {(service.included || service.problems).map((item) => <li key={item} className="rounded-lg bg-white p-3 text-sm text-slate-700 border border-slate-200">{item}</li>)}
                </ul>
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900">What affects the price?</h2>
                <p className="mt-5 text-sm leading-7 text-slate-600">{service.priceFactors || 'The final cost depends on the job scope, time, access and any replacement materials. Confirm the scope and price with the professional before work begins.'}</p>
              </div>
            </section>
          </>
        )}

        {!isCityPage && (
          <section className="mt-12 border-t border-slate-200 pt-8">
            <h2 className="text-2xl font-black text-slate-900">What {service.shortName} service typically includes</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-extrabold text-slate-900">Service types</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Typical requests include troubleshooting, repair, replacement, installation, preventive checks, and small improvement work based on the issue and property layout.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-extrabold text-slate-900">What to expect</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Most jobs are booked with a short description of the problem, a location, and a preferred time. Availability depends on the technician and the service category in your area.</p>
              </div>
            </div>
          </section>
        )}

        {/* Related services */}
        <section className="mt-12">
          <h2 className="text-2xl font-black text-slate-900">
            {isCityPage ? `Explore services in ${cityName}` : 'Related services'}
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedServices.map(([relatedSlug, item]) => (
              <a
                key={relatedSlug}
                href={routeType === 'service' || isIntentPage ? `/services/${relatedSlug}` : `/cities/${citySlug}/${relatedSlug}`}
                onClick={(e) => { e.preventDefault(); navigateToServiceCity(relatedSlug); }}
                className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-800 hover:border-teal-400 hover:text-teal-700 transition-colors flex items-center justify-between"
              >
                {item.name}
                <ArrowRight className="ml-2 h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>

        {/* Service areas */}
        <section className="mt-12 border-t border-slate-200 pt-8">
          <h2 className="text-2xl font-black text-slate-900">Areas we serve in {cityName}</h2>
          <p className="mt-2 text-sm text-slate-600">
            Service availability depends on the selected category and current provider coverage in your area.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {city.areas.map((area) => (
              <span
                key={area}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {area}
              </span>
            ))}
          </div>
        </section>

        {/* FAQ section */}
        {faqs && faqs.length > 0 && (
          <section className="mt-12 border-t border-slate-200 pt-8">
            <h2 className="text-2xl font-black text-slate-900">
              {isCityPage ? 'Frequently asked questions' : (isIntentPage ? `${intent.h1} FAQs` : `${service.shortName} FAQs`)}
            </h2>
            <div className="mt-5 space-y-3">
              {faqs.map((faq, i) => (
                <FAQItem key={faq.q} faq={faq} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="mt-12 rounded-2xl bg-teal-700 px-6 py-8 text-center text-white">
          <h2 className="text-xl font-extrabold tracking-tight">
            {isCityPage ? `Ready to book a home service in ${cityName}?` : `Need ${service.shortName} help in ${cityName}?`}
          </h2>
          <p className="mt-2 text-sm text-teal-100">
            Browse available services and connect with an available professional near you.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('services')}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-teal-700 hover:bg-teal-50 transition-colors shadow-md"
          >
            Browse Services <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>

      </div>
    </main>
  );
}
