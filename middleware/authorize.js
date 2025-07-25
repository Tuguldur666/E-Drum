const jwt = require('jsonwebtoken');

const hasRole = (requiredRole) => {
  return (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
      return res.status(403).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      req.user = decoded;  // Add decoded data to the request object

      // Check if the role matches the required role
      if (req.user.role !== requiredRole) {
        return res.status(403).json({ success: false, message: `Access denied. Not a ${requiredRole}.` });
      }

      next();  // Proceed to the next middleware or route handler
    } catch (err) {
      console.error(err);
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
  };
};

// Usage for specific roles:
const isAdmin = hasRole('admin');
const isStore = hasRole('store');
const isTeacher = hasRole('teacher');  

module.exports = {
  isAdmin,
  isStore,
  isTeacher 
};