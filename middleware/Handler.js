

function errorHandler(err, req, res, next) {
  console.error('[Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
}


function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
}


function requestLogger(req, res, next) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
}


function rateLimiter(req, res, next) {

  if (req.rateLimitExceeded) {
    return res.status(429).json({ success: false, error: 'Too many requests' });
  }
  next();
}

function sanitizeInputs(req, res, next) {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].trim();
      }
    }
  };

  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);

  next();
}

module.exports = {
  errorHandler,
  notFoundHandler,
  requestLogger,
  rateLimiter,
  sanitizeInputs
};
