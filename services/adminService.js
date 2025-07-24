const User = require('../models/user');
const bcrypt = require('bcrypt');
const { verifyToken } = require('../utils/token');

async function adminRegisterUser(accessToken, { firstName, lastName, phoneNumber, email, password, role }) {
  try {
    const decoded = verifyToken(accessToken);
    if (!decoded?.userId) {
      return { success: false, status: 401, message: 'Invalid access token' };
    }

    const adminUser = await User.findById(decoded.userId);
    if (!adminUser || adminUser.role !== 'admin') {
      return { success: false, status: 403, message: 'Access denied. Admins only.' };
    }

    firstName = firstName?.trim();
    lastName = lastName?.trim();
    phoneNumber = phoneNumber?.trim();
    email = email?.trim().toLowerCase();
    role = role?.trim();

    if (!firstName || !lastName || !phoneNumber || !email || !password || !role) {
      return { success: false, message: 'All fields are required.' };
    }

    const existingUser = await User.findOne({
      $or: [{ phoneNumber }, { email }],
      isVerified: true
    });

    if (existingUser) {
      return { success: false, message: 'User with this phone or email already exists.' };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      firstName,
      lastName,
      phoneNumber,
      email,
      password: hashedPassword,
      role,
      isVerified: true,
      createdAt: new Date()
    });

    await newUser.save();

    return {
      success: true,
      message: `${role} registered successfully by admin.`,
      userId: newUser._id
    };

  } catch (err) {
    console.error('❌ adminRegisterUser Error:', err);
    return {
      success: false,
      message: 'Failed to register user as admin'
    };
  }
}

module.exports = { adminRegisterUser }