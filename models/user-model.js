const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// User schema
const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phoneNumber: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  role: { type: String, enum: ['teacher', 'student', 'store', 'admin'], required: true, default: 'student' },
  score: { type: Number, default: 0 },
  lastLogin: { type: Date, default: null },
  userId: { 
    type: Number, 
    unique: true, 
    required: true,
  },
}, { timestamps: true });

// Pre-save hook to generate userId before saving
UserSchema.pre('save', async function (next) {
  // If userId is not set (null, undefined, or an invalid value), generate it
  if (!this.userId || isNaN(this.userId) || typeof this.userId === 'string') {
    this.userId = Math.floor(Math.random() * 9000000) + 1000000;
  }

  // Ensure userId is a valid 7-digit number (sanity check)
  if (!Number.isInteger(this.userId) || this.userId < 1000000 || this.userId > 9999999) {
    this.userId = Math.floor(Math.random() * 9000000) + 1000000;  // Re-generate if invalid
  }

  next();
});

// Hash password before saving if modified
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare plain password with hashed password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT Access Token (short expiry)
UserSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '10m' }
  );
};

// Generate JWT Refresh Token (longer expiry)
UserSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '1d' }
  );
};

// Generate JWT Reset Password Token (for password reset)
UserSchema.methods.generateResetPasswordToken = function () {
  return jwt.sign(
    { id: this._id, phoneNumber: this.phoneNumber },
    process.env.RESET_PASSWORD_TOKEN_SECRET,  
    { expiresIn: '1h' }  
  );
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
