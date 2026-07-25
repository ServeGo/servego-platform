/**
 * Migration script: Upload existing base64 provider photos to Cloudinary.
 *
 * Usage:
 *   node backend/scripts/migrate-photos-to-cloudinary.js
 *
 * Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { PrismaClient } from '@prisma/client';
import { uploadBase64ToCloudinary } from '../services/cloudinaryService.js';

const prisma = new PrismaClient();

async function migrate() {
  console.log('🔍 Finding providers with base64 photos...');

  const providers = await prisma.provider.findMany({
    where: {
      photo: { not: null },
    },
    select: {
      id: true,
      userId: true,
      photo: true,
    },
  });

  const base64Providers = providers.filter(
    (p) => p.photo && p.photo.startsWith('data:image')
  );

  console.log(`📦 Found ${base64Providers.length} provider(s) with base64 photos to migrate.`);

  if (base64Providers.length === 0) {
    console.log('✅ Nothing to migrate.');
    await prisma.$disconnect();
    return;
  }

  let success = 0;
  let failed = 0;

  for (const provider of base64Providers) {
    try {
      process.stdout.write(`  ⏳ Uploading photo for provider ${provider.id}... `);
      const result = await uploadBase64ToCloudinary(provider.photo, 'servego/providers');
      await prisma.provider.update({
        where: { id: provider.id },
        data: { photo: result.url },
      });
      console.log(`✅ done → ${result.url}`);
      success++;
    } catch (err) {
      console.log(`❌ failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Migration complete: ${success} succeeded, ${failed} failed.`);
  await prisma.$disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
