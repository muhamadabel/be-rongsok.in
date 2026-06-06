const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';
  const errors = err.errors || [];

  // Handle Multer-specific limits
  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 400;
    message = 'File size too large. Maximum size allowed is 5MB.';
  } else if (err.message && err.message.includes('Only images are allowed')) {
    status = 400;
    message = err.message;
  }

  res.status(status).json({
    status: 'error',
    message,
    errors
  });
};

module.exports = { errorHandler };
