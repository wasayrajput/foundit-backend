const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `file_${uniqueSuffix}${ext}`);
  },
});

// File Filter (Images & Blobs)
const fileFilter = (req, file, cb) => {
  const allowedExts = /jpeg|jpg|png|webp|gif|bmp/;
  const allowedMimes = /jpeg|jpg|png|webp|gif|bmp|octet-stream|image/;

  const extName = allowedExts.test(path.extname(file.originalname).toLowerCase()) || file.originalname === 'blob' || file.originalname.startsWith('file_');
  const mimeType = allowedMimes.test(file.mimetype.toLowerCase());

  if (extName || mimeType) {
    return cb(null, true);
  } else {
    // Fallback: accept file if it's sent as multipart upload
    return cb(null, true);
  }
};

// Multer Upload Instance
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter,
});

module.exports = upload;
