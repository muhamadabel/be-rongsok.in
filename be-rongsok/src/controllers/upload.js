const { uploadSingleImage } = require('../utils/cloudinary');

const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded. Please upload a valid image file.'
      });
    }

    // Upload to Cloudinary
    const result = await uploadSingleImage(req.file.buffer, 'rongsokin');

    res.status(200).json({
      status: 'success',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        bytes: result.bytes,
        format: result.format
      }
    });
  } catch (error) {
    // If Cloudinary config is missing or upload fails, return 500 or appropriate status
    if (error.message && error.message.includes('Cloudinary environment variables')) {
      return res.status(500).json({
        status: 'error',
        message: 'Server storage configuration error. Cloudinary is not configured.'
      });
    }
    next(error);
  }
};

module.exports = {
  uploadImage
};
