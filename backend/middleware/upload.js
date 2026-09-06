import multer from 'multer';

const storage = multer.memoryStorage();

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export const uploadImage = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      const err = new Error('Only JPEG, PNG, WebP and GIF images are allowed');
      err.code = 'INVALID_FILE_TYPE';
      err.statusCode = 400;
      return cb(err, false);
    }
    cb(null, true);
  },
});
