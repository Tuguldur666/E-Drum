const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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


UserSchema.pre('save', async function (next) {

  if (!this.userId || isNaN(this.userId) || typeof this.userId === 'string') {
    this.userId = Math.floor(Math.random() * 9000000) + 1000000;
  }
  
  if (!Number.isInteger(this.userId) || this.userId < 1000000 || this.userId > 9999999) {
    this.userId = Math.floor(Math.random() * 9000000) + 1000000;  
  }

  next();
});


userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = mongoose.model('User', userSchema);

