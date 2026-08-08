const express = require('express');
const upload = require('../middlewares/uploadMiddleware');
const {
  uploadSingleImage,
  uploadMultipleImages,
} = require('../controllers/uploadController');

const router = express.Router();

router.post('/single', upload.single('image'), uploadSingleImage);
router.post('/multiple', upload.array('images', 5), uploadMultipleImages);

module.exports = router;
