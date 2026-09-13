import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

cloudinary.config({
  cloud_name: 'dal84gvkm',
  api_key: '984268245422973',
  api_secret: 'aHk2iawxPw0qPf-J3UWcGyCYL24',
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../../frontend/public');

const imagePaths = [
  ...fs.readdirSync(path.join(PUBLIC_DIR, 'images')).map((f) => path.join(PUBLIC_DIR, 'images', f)),
  path.join(PUBLIC_DIR, 'favicon.png'),
  path.join(PUBLIC_DIR, 'service-appliance-repair.png'),
].filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f));

async function uploadAll() {
  console.log(`Uploading ${imagePaths.length} images to Cloudinary...\n`);
  const results = [];

  for (const filePath of imagePaths) {
    const fileName = path.basename(filePath);
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'servego/public',
        use_filename: false,
        unique_filename: true,
        resource_type: 'image',
      });
      console.log(`✅ ${fileName}\n   → ${result.secure_url}\n`);
      results.push({ file: fileName, url: result.secure_url, publicId: result.public_id });
    } catch (err) {
      console.error(`❌ ${fileName}: ${err.message}`);
    }
  }

  const outPath = path.resolve(__dirname, 'uploaded-public-images.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nDone. URLs saved to ${outPath}`);
}

uploadAll();
