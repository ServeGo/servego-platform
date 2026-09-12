import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UPLOAD_FOLDER = 'servego';

export const uploadToCloudinary = (fileBuffer, originalName, folder = UPLOAD_FOLDER) => {
  return new Promise((resolve, reject) => {
    const ext = originalName?.split('.').pop()?.toLowerCase() || 'jpg';
    const publicId = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        format: ext === 'jpg' ? 'jpg' : ext,
        transformation: [
          { width: 800, height: 800, crop: 'limit', quality: 'auto' },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    stream.end(fileBuffer);
  });
};

export const uploadBase64ToCloudinary = (base64DataUrl, folder = UPLOAD_FOLDER) => {
  return new Promise((resolve, reject) => {
    const publicId = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    cloudinary.uploader.upload(
      base64DataUrl,
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit', quality: 'auto' },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );
  });
};

export default cloudinary;
