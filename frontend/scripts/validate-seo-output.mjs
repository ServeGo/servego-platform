const baseUrl = process.env.SEO_BASE_URL || 'http://127.0.0.1:4174';

const routes = [
  '/',
  '/services',
  '/services/electrician',
  '/services/plumber',
  '/services/ac-repair',
  '/cities/hyderabad',
  '/cities/hyderabad/electrician',
  '/cities/hyderabad/plumber',
  '/help/ac-not-cooling',
  '/help/tap-leaking',
  '/join-as-provider',
  '/about',
  '/contact',
  '/faq',
];

function metaContent(html, name) {
  const match = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'));
  return match?.[1] || '';
}

function canonicalHref(html) {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i);
  return match?.[1] || '';
}

function propertyContent(html, property) {
  const match = html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'));
  return match?.[1] || '';
}

function namedContent(html, name) {
  const match = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'));
  return match?.[1] || '';
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let failures = 0;
for (const route of routes) {
  const response = await fetch(`${baseUrl}${route}`);
  const html = await response.text();
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '';
  const description = metaContent(html, 'description');
  const robots = metaContent(html, 'robots');
  const canonical = canonicalHref(html);
  const ogTitle = propertyContent(html, 'og:title');
  const ogUrl = propertyContent(html, 'og:url');
  const twitterTitle = namedContent(html, 'twitter:title');
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]+>/g, '').trim() || '';
  const jsonLd = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const expectedCanonical = `https://servego24.com${route === '/' ? '' : route}`;

  try {
    assert(response.status === 200, `${route}: expected 200, received ${response.status}`);
    assert(title && !title.includes('ServeGo24 - Home Services in Hyderabad | Book Electrician, Plumber, AC Repair') || route === '/', `${route}: homepage title leaked into deep route`);
    assert(description, `${route}: missing description`);
    assert(canonical === expectedCanonical, `${route}: canonical ${canonical} does not equal ${expectedCanonical}`);
    assert(robots.toLowerCase().includes('index') && robots.toLowerCase().includes('follow'), `${route}: robots is ${robots}`);
    assert(ogTitle === title && ogUrl === expectedCanonical, `${route}: Open Graph metadata does not match the route`);
    assert(twitterTitle === title, `${route}: Twitter title does not match the route`);
    assert(h1, `${route}: missing initial H1`);
    assert(jsonLd.length > 0, `${route}: missing initial JSON-LD`);
    for (const block of jsonLd) JSON.parse(block[1]);
    console.log(`PASS ${route} | ${title} | ${canonical}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${route}: ${error.message}`);
  }
}

if (failures) process.exit(1);
console.log(`Validated ${routes.length} raw SEO responses.`);
