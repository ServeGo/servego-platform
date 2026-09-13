# ServeGo24 SEO Ranking Plan

Updated: 2026-09-14

This is an internal working document. Scores are implementation-readiness scores, not ranking predictions. No Top 3 position is guaranteed.

## Priority Page Scores

| Page | Intent | Score | Main constraint |
| --- | --- | ---: | --- |
| Electrician Hyderabad | Local transactional | 72/100 | CSR metadata, no verified review proof, limited external authority |
| Plumber Hyderabad | Local transactional | 72/100 | CSR metadata, no verified review proof, limited external authority |
| AC Repair Hyderabad | Local transactional | 74/100 | CSR metadata, no verified review proof, limited external authority |
| Electrician service | Service discovery | 70/100 | Needs stronger provider and booking evidence |
| Plumber service | Service discovery | 70/100 | Needs stronger provider and booking evidence |
| AC Repair service | Service discovery | 72/100 | Needs stronger maintenance and diagnostic depth |

Scoring dimensions: search intent 15, usefulness 15, local relevance 10, technical SEO 15, internal linking 10, trust 10, CTR 10, conversion 5, schema 5, performance 5.

## SERP Gap Comparison

A direct Google result scrape was attempted on 2026-09-14, but Google returned a JavaScript challenge rather than usable result pages. The competitor column below is therefore a research framework, not a claim about the current exact Top 10 order. Validate each query in Search Console and a localized clean browser before making ranking claims.

| Keyword | Current competitor patterns to verify | Likely missing information | ServeGo24 improvement |
| --- | --- | --- | --- |
| electrician in Hyderabad | Marketplace category pages, local electrical contractors, map results | Clear fault coverage, response expectations, price factors, safety guidance | Service page plus electrical fault and emergency guides |
| plumber in Hyderabad | Marketplace category pages, local plumbers, map results | Leak triage, blockage guidance, material expectations | Service page plus tap leaking, drain blockage and emergency guides |
| AC repair in Hyderabad | Marketplace pages, brand/dealer pages, local AC companies | Diagnosis before gas refill, leakage/noise guidance, maintenance scope | AC page plus cooling, leakage, noise and maintenance guides |

Do not copy competitor wording. Compare rendered content, local proof, reviews, business details, booking friction, page speed and link authority manually.

## First 20 Keyword Targets

| # | Keyword | Intent | Target URL | Value | Priority | Readiness |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | electrician in Hyderabad | Local transactional | /cities/hyderabad/electrician | High | P0 | Good, CSR blocker |
| 2 | plumber in Hyderabad | Local transactional | /cities/hyderabad/plumber | High | P0 | Good, CSR blocker |
| 3 | AC repair in Hyderabad | Local transactional | /cities/hyderabad/ac-repair | High | P0 | Good, CSR blocker |
| 4 | electrician near me Hyderabad | Local transactional | /cities/hyderabad/electrician | High | P0 | Needs local authority |
| 5 | emergency electrician Hyderabad | Urgent transactional | /help/emergency-electrician | High | P0 | Content ready, needs validation |
| 6 | emergency plumber Hyderabad | Urgent transactional | /help/emergency-plumber | High | P0 | Content ready, needs validation |
| 7 | AC not cooling Hyderabad | Problem transactional | /help/ac-not-cooling | High | P0 | Content ready, needs validation |
| 8 | AC water leakage Hyderabad | Problem transactional | /help/ac-water-leakage | High | P0 | Content ready, needs validation |
| 9 | tap leaking plumber Hyderabad | Problem transactional | /help/tap-leaking | High | P0 | Content ready, needs validation |
| 10 | drain blockage plumber Hyderabad | Problem transactional | /help/drain-blockage | High | P0 | Content ready, needs validation |
| 11 | home services in Hyderabad | Category discovery | /cities/hyderabad | High | P0 | Good, needs deeper hub proof |
| 12 | electrical fault repair Hyderabad | Problem transactional | /help/electrical-fault | Medium | P1 | Content ready, needs validation |
| 13 | AC service Hyderabad | Transactional | /services/ac-repair | High | P1 | Good, needs reviews and availability proof |
| 14 | AC maintenance Hyderabad | Preventive transactional | /help/ac-maintenance | Medium | P1 | Content ready, needs validation |
| 15 | AC making noise Hyderabad | Problem transactional | /help/ac-unusual-noise | Medium | P1 | Content ready, needs validation |
| 16 | electrician for fan repair Hyderabad | Transactional | /services/electrician | Medium | P1 | Needs dedicated content only if demand validates |
| 17 | switch socket repair Hyderabad | Transactional | /services/electrician | Medium | P1 | Needs dedicated content only if demand validates |
| 18 | pipe leakage repair Hyderabad | Transactional | /services/plumber | Medium | P1 | Needs dedicated content only if demand validates |
| 19 | plumbing service Hyderabad | Transactional | /services/plumber | High | P1 | Good, CSR blocker |
| 20 | split AC repair Hyderabad | Transactional | /services/ac-repair | High | P1 | Needs split-AC-specific evidence |

## Implemented Cluster Work

- Added original intent records for electrical faults, emergency electrician help, leaking taps, blocked drains, emergency plumbing, AC cooling failure, AC leakage, AC noise and AC maintenance.
- Added `/help/:intent` routing through the existing public landing template.
- Added visible symptoms, safe first steps, when-to-book guidance, FAQs and links to both the service page and Hyderabad page.
- Added local context, included work and truthful price-factor explanations to the three priority service records.
- Added contextual guide links to the public footer.
- Added the nine substantive help pages to the public sitemap.
- Kept area pages out of the index until actual coverage and unique local information are verified.

## Indexation Decisions

Index:

- `/services/electrician`, `/services/plumber`, `/services/ac-repair`
- `/cities/hyderabad`
- `/cities/hyderabad/electrician`, `/cities/hyderabad/plumber`, `/cities/hyderabad/ac-repair`
- The nine `/help/` pages listed in the sitemap

Do not create or index city-area pages yet. The current area list is informational only and is not evidence that ServeGo24 has verified coverage in every named locality.

## Production Verification

| Check | Result |
| --- | --- |
| Vite build | Passed: `npm run build` |
| Representative HTTP status | 200 for all three checked deep URLs |
| Sitemap inclusion | Passed for priority services, Hyderabad service pages, and help pages |
| Client-side metadata | Route-specific title, description, canonical, OG and JSON-LD are generated by `useSEO` |
| Initial HTML metadata | Fails page specificity: deep URLs return the homepage title, description and canonical before JavaScript |
| JSON-LD in initial HTML | Not present before JavaScript |
| CSR limitation | Important SEO metadata/content depends on JavaScript execution |

The CSR limitation is the current production blocker. Reliable long-term organic growth requires either prerendering/static generation for public routes, server-side rendering, or an edge/build step that emits route-specific HTML. Do not describe technical SEO as fully solved until this is addressed.

## Next 10 SEO Actions

1. Add prerendered HTML for the three priority service pages, Hyderabad hub and nine help pages.
2. Verify rendered routes in URL Inspection and submit the sitemap index in Search Console.
3. Replace unverified area coverage with a maintained service-availability source of truth.
4. Capture and publish real reviews only when consent and structured review data are available.
5. Add verified provider/business details to money pages without inventing counts or ratings.
6. Measure impressions, CTR, calls, booking starts and completed bookings by landing URL.
7. Run localized SERP checks for the 20 target queries and fill the competitor table with observed URLs.
8. Add split/window AC and fan/switch intent content only after Search Console or customer demand validates it.
9. Earn local authority through genuine partnerships, profiles and useful Hyderabad service resources.
10. Re-score the six money pages monthly using real crawl, Search Console and conversion data.
