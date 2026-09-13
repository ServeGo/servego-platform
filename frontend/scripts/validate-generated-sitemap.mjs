import fs from 'node:fs/promises';
import path from 'node:path';

const distDirectory = path.resolve('dist');
const sitemapFiles = [
  'public/sitemap-pages.xml',
  'public/sitemap-cities.xml',
  'public/sitemap-service-cities.xml',
];

const sitemapUrls = [];
for (const sitemapFile of sitemapFiles) {
  const xml = await fs.readFile(sitemapFile, 'utf8');
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) sitemapUrls.push(match[1]);
}

const duplicates = sitemapUrls.filter((url, index) => sitemapUrls.indexOf(url) !== index);
if (duplicates.length) {
  throw new Error(`Duplicate sitemap URLs: ${[...new Set(duplicates)].join(', ')}`);
}

let missing = 0;
for (const sitemapUrl of sitemapUrls) {
  const route = new URL(sitemapUrl).pathname;
  const relativePath = route === '/' ? 'index.html' : path.join(route.slice(1), 'index.html');
  const generatedPath = path.join(distDirectory, relativePath);
  try {
    await fs.access(generatedPath);
    console.log(`PASS ${route} -> ${relativePath}`);
  } catch {
    missing += 1;
    console.error(`FAIL ${route} -> missing ${relativePath}`);
  }
}

if (missing) throw new Error(`${missing} sitemap URL(s) have no generated HTML document.`);
console.log(`Validated ${sitemapUrls.length} sitemap URLs against generated dist documents.`);
