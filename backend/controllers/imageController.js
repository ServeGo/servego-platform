import { uploadToCloudinary } from '../services/cloudinaryService.js';
import { sendApiSuccess, sendApiError } from '../utils/response.js';

const ALLOWED_FOLDERS = new Set([
  'servego',
  'servego/customers',
  'servego/providers',
  'servego/services',
]);

export const ImageController = {
  upload: async (req, res) => {
    try {
      if (!req.file) {
        return sendApiError(res, 400, 'NO_FILE', 'Please select an image to upload');
      }

      const requestedFolder = String(req.body.folder || 'servego');
      const folder = ALLOWED_FOLDERS.has(requestedFolder) ? requestedFolder : 'servego';

      const result = await uploadToCloudinary(
        req.file.buffer,
        req.file.originalname,
        folder
      );

      return sendApiSuccess(res, 200, {
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      });
    } catch (err) {
      console.error('Image upload error:', err);
      return sendApiError(res, 500, 'UPLOAD_FAILED', 'Failed to upload image. Please try again.', err.message);
    }
  },
};
