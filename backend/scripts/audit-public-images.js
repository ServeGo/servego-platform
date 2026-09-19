/**
 * Audit script: list Cloudinary assets under servego/public (and any root
 * fallback) and flag which ones are referenced by the app (code + DB).
 *
 * Read-only — does NOT delete anything.
 *
 * Usage:
 *   node backend/scripts/audit-public-images.js
 *
 * Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * and DATABASE_URL in backend/.env
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { v2: cloudinary } = await import('cloudinary');
const { PrismaClient } = await import('@prisma/client');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const prisma = new PrismaClient();

const SCOPE = 'servego/';

async function listAssets(folder) {
  try {
    const { resources } = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      resource_type: 'image',
      max_results: 500,
    });
    return resources.map((r) => r.public_id);
  } catch (err) {
    console.error(`[!] Could not list folder "${folder}": ${err.message}`);
    return [];
  }
}

const all = new Set();

// ── 1. Code references (frontend src + backend, excluding upload manifests) ─
// Only the assets that live under the servego scope matter here; still scan the
// whole frontend/backend so the resolver can match out-of-scope refs too.
const repoRoot = path.join(__dirname, '..', '..');
const codeRefs = new Set();
const SKIP_FILES = new Set(['uploaded-public-images.json', 'audit-public-images.js']);
const copyPush = (dir) => {
  if (!fs.existsSync(dir)) return;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build' || entry.name === 'android') continue;
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (SKIP_FILES.has(entry.name)) continue;
      else if (/\.(js|jsx|ts|json|css|html)$/i.test(entry.name)) {
        let text;
        try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }
        for (const m of text.matchAll(/https:\/\/res\.cloudinary\.com\/[a-z0-9_-]+\/image\/upload\/[A-Za-z0-9_./-]+/g)) {
          codeRefs.add(m[0].replace(/\/v\d{10,}\//, '/'));
        }
      }
    }
  };
  walk(dir);
};
copyPush(path.join(repoRoot, 'frontend', 'src'));
copyPush(path.join(repoRoot, 'backend', 'src'));
copyPush(path.join(repoRoot, 'backend', 'scripts'));
copyPush(path.join(repoRoot, 'backend', 'data'));

// ── 2. DB references ─────────────────────────────────────────────────────────
const dbRefs = new Set();
async function collectDb() {
  const plain = new PrismaClient();
  const [services, providers, users] = await Promise.all([
    plain.service.findMany({ select: { image: true } }),
    plain.provider.findMany({ select: { photo: true } }),
    plain.user.findMany({ select: { avatar: true }, where: { avatar: { not: null } } }),
  ]);
  for (const r of [...services, ...providers, ...users]) {
    const v = r.image || r.photo || r.avatar || '';
    for (const m of v.matchAll(/https:\/\/res\.cloudinary\.com\/[a-z0-9_-]+\/image\/upload\/[A-Za-z0-9_./-]+/g)) {
      dbRefs.add(m[0].replace(/\/v\d{10,}\//, '/'));
    }
  }
  await plain.$disconnect();
}

// ── 3. Resolve used vs unused ────────────────────────────────────────────────
function urlToPid(url) {
  const base = url.replace(/\/v\d{10,}\//, '/');
  const extMatch = base.match(/\.(png|jpg|jpeg|webp|gif|svg)$/);
  const ext = extMatch ? extMatch[1] : '';
  const stripped = ext ? base.replace(new RegExp(`\\.${ext}$`), '') : base;
  return stripped.replace(/^https:\/\/res\.cloudinary\.com\/[a-z0-9_-]+\/image\/upload\//, '');
}

async function main() {
  console.log(`Listing Cloudinary assets under "${SCOPE}"...`);
  for (const pid of await listAssets(SCOPE)) all.add(pid);
  console.log(`Found ${all.size} assets under ${SCOPE} (publicId).`);

  console.log('Collecting database references...');
  await collectDb();

  const usedPids = new Set();
  const unused = [];

  const dbUrlPids = new Set();
  for (const u of dbRefs) dbUrlPids.add(urlToPid(u));
  const codeUrlPids = new Set();
  for (const u of codeRefs) codeUrlPids.add(urlToPid(u));

  for (const pid of all) {
    const used = dbUrlPids.has(pid) || codeUrlPids.has(pid);
    if (used) usedPids.add(pid);
    else unused.push(pid);
  }

  console.log('\n── USED (keep) ────────────────────────────────────────');
  for (const pid of [...usedPids].sort()) {
    const flags = [];
    if (dbUrlPids.has(pid)) flags.push('DB');
    if (codeUrlPids.has(pid)) flags.push('CODE');
    console.log(`${pid}   [${flags.join(',')}]`);
  }

  console.log('\n── UNUSED (candidates for deletion) ──────────────────');
  for (const pid of unused.sort()) console.log(pid);

  console.log(`\nTotal: ${all.size} | used: ${usedPids.size} | unused: ${unused.length}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});