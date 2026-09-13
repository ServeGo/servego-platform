# ServeGo24 Production SEO Verification Checklist

Target: `https://servego24.com`

Status date: 2026-09-14

## Current status

Live verification is **externally pending**. The current development environment cannot complete TLS handshakes to `servego24.com`, so no live HTTP or Google result is claimed here.

Run the commands below from a network that can reach the production domain. Save the output with the deployment commit and date.

## 1. Raw route smoke test

PowerShell:

```powershell
$routes = @(
  '/', '/services', '/services/electrician', '/services/plumber', '/services/ac-repair',
  '/cities/hyderabad', '/cities/hyderabad/electrician', '/cities/hyderabad/plumber',
  '/help/ac-not-cooling', '/help/tap-leaking', '/join-as-provider', '/about', '/contact', '/faq'
)
foreach ($route in $routes) {
  $response = Invoke-WebRequest -Uri "https://servego24.com$route" -UseBasicParsing
  $html = $response.Content
  $title = [regex]::Match($html, '<title>(.*?)</title>', 'IgnoreCase').Groups[1].Value
  $description = [regex]::Match($html, '<meta[^>]+name="description"[^>]+content="([^"]+)"', 'IgnoreCase').Groups[1].Value
  $canonical = [regex]::Match($html, '<link[^>]+rel="canonical"[^>]+href="([^"]+)"', 'IgnoreCase').Groups[1].Value
  $robots = [regex]::Match($html, '<meta[^>]+name="robots"[^>]+content="([^"]+)"', 'IgnoreCase').Groups[1].Value
  $h1 = [regex]::Match($html, '<h1[^>]*>(.*?)</h1>', 'IgnoreCase').Groups[1].Value
  $jsonLd = $html -match 'application/ld\+json'
  $og = $html -match 'property="og:title"'
  $twitter = $html -match 'name="twitter:title"'
  Write-Output "$route status=$($response.StatusCode) type=$($response.Headers['Content-Type']) title=$title canonical=$canonical robots=$robots jsonLd=$jsonLd h1=$h1 og=$og twitter=$twitter"
}
```

Acceptance criteria for every route:

- HTTP `200`
- No unexpected redirect
- `Content-Type: text/html`
- Route-specific title and description
- Self-referencing canonical
- `index, follow`
- Open Graph and Twitter metadata
- Valid initial JSON-LD
- Route-specific first H1 and useful content

The deep route must not contain the homepage title or homepage canonical.

## 2. Exact Vercel static-file checks

```bash
curl -I -L https://servego24.com/services/electrician
curl -I -L https://servego24.com/cities/hyderabad/electrician
curl -I -L https://servego24.com/help/ac-not-cooling
curl -s https://servego24.com/cities/hyderabad/electrician | grep -i "<title>\|canonical\|application/ld+json"
```

Expected behavior:

```text
/services/electrician -> dist/services/electrician/index.html
/cities/hyderabad/electrician -> dist/cities/hyderabad/electrician/index.html
/help/ac-not-cooling -> dist/help/ac-not-cooling/index.html
```

`vercel.json` keeps the SPA catch-all rewrite. Vercel filesystem routing must resolve an existing generated file before that rewrite. Do not change the rewrite unless the live checks demonstrate otherwise.

## 3. Robots and sitemap checks

```bash
curl -i https://servego24.com/robots.txt
curl -i https://servego24.com/sitemap-index.xml
curl -i https://servego24.com/sitemap-pages.xml
curl -i https://servego24.com/sitemap-cities.xml
curl -i https://servego24.com/sitemap-service-cities.xml
```

Confirm:

- `/help/`, `/services/`, and `/cities/` are crawlable
- `/dashboard-*`, `/provider-home`, `/customer-home`, `/admin`, and `/api/` remain restricted
- Sitemap index is declared
- No site-wide `noindex`
- Every sitemap is valid XML and returns `200`
- No duplicate URLs or private URLs
- Every URL resolves without an unexpected redirect
- Every URL has a self-referencing canonical and indexable robots directive

## 4. Local build gate

From `frontend`:

```powershell
npm run build
npm run validate:generated-sitemap
npm run validate:seo
npm run validate:sitemap
```

The build now runs `validate:generated-sitemap` after prerendering and fails if a sitemap URL has no corresponding `dist/<route>/index.html`.

## 5. Search Console setup

The owner must:

1. Verify `servego24.com` as a Domain property.
2. Submit `https://servego24.com/sitemap-index.xml`.
3. Inspect the six priority URLs:
   - `/services/electrician`
   - `/cities/hyderabad/electrician`
   - `/services/plumber`
   - `/cities/hyderabad/plumber`
   - `/services/ac-repair`
   - `/help/ac-not-cooling`
4. Record crawl status, indexing status, Google-selected canonical, mobile usability, enhancements, and any indexing reason.

A page is not considered indexed until Search Console confirms it.

## 6. Ranking baseline

Use [SEO_RANKING_BASELINE.md](SEO_RANKING_BASELINE.md). Record for each keyword:

- Date
- Query
- Position
- Impressions
- Clicks
- CTR
- Landing page
- Organic booking start
- Completed booking

Until Search Console or a verified localized SERP capture is available, mark the value **Baseline unavailable**.

## 7. SERP and authority research

Capture actual localized Top 10 results before filling competitive claims. Record ranking URL, page type, local relevance, content structure, FAQs, internal links, trust signals, CTA, and approximate authority.

Use Urban Company, NoBroker, Justdial, Sulekha, Housejoy, HomeTriangle, Mr. Right, Helper4U, and any other domains that actually rank. Do not use PBNs, paid link schemes, automated blasts, or irrelevant directory spam.

## Final status model

- LOCAL CODE: **PASS**
- PRERENDERING: **PASS**
- PRODUCTION ROUTING: **UNVERIFIED** until external HTTP test passes
- PRODUCTION INDEXABILITY: **UNVERIFIED** until deployment and Search Console confirm it
- SITEMAP: **PASS locally; production pending**
- ROBOTS: **PASS locally; production pending**
- SEARCH CONSOLE: **NOT CONNECTED from this workspace**
- RANKING DATA: **UNAVAILABLE**
- AUTHORITY DATA: **UNAVAILABLE**
- CONVERSION DATA: **UNAVAILABLE**

Biggest current blocker: external production TLS/connectivity prevents live verification.

Highest-value next action: run this checklist from an externally reachable network immediately after deployment, then submit the sitemap index and inspect the six priority URLs in Search Console.
