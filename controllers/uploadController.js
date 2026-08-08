// @desc    Upload a single image file
// @route   POST /api/upload/single
// @access  Public / Private
exports.uploadSingleImage = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please attach an image file' });
    }

    const relativePath = `/uploads/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get('host')}${relativePath}`;

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      filePath: relativePath,
      url: fullUrl,
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.uploadMultipleImages = (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Please attach at least one image file' });
    }

    const fileList = req.files.map((file) => {
      const relativePath = `/uploads/${file.filename}`;
      const fullUrl = `${req.protocol}://${req.get('host')}${relativePath}`;
      return {
        filePath: relativePath,
        url: fullUrl,
        filename: file.filename,
      };
    });

    res.status(200).json({
      success: true,
      message: `${fileList.length} image(s) uploaded successfully`,
      files: fileList,
      filePaths: fileList.map((f) => f.filePath),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
