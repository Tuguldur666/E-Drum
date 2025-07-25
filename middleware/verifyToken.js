const jwt = require('jsonwebtoken');
const HttpError = require('./http-error');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new HttpError('Authentication failed. Token missing.', 401));
  }

  const token = authHeader.split(' ')[1]; 

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.userData = decoded; 
    next();
  } catch (err) {
    return next(new HttpError('Invalid or expired token.', 403));
  }
};
