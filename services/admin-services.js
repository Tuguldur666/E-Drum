const User = require('../models/user-model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const HttpError = require('../middleware/http-error');

// === Login User ===
const login = async ({ phoneNumber, password }) => {
  try {
    // Find user by phone number
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      throw new HttpError('User not found.', 404);
    }

    // Validate the password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new HttpError('Invalid credentials.', 401);
    }

    // Generate JWT tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    return {
      message: 'Login successful',
      user: user.toObject({ getters: true }), // Exclude sensitive fields like password
      accessToken,
      refreshToken
    };
  } catch (err) {
    throw new HttpError(err.message || 'Something went wrong.', 500);
  }
};

// === Create User ===
const createUser = async ({ firstName, lastName, email, phoneNumber, password, role }) => {
  try {
    // Validate user role
    if (!['teacher', 'store'].includes(role)) {
      throw new HttpError('Role must be either teacher or store.', 400);
    }

    // Check if email or phone number already exists
    const existingUser = await User.findOne({
      $or: [{ email: email }, { phoneNumber: phoneNumber }]
    });
    if (existingUser) {
      throw new HttpError('Email or phone number already in use.', 400);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      email,
      phoneNumber,
      password: hashedPassword,
      role
    });

    // Save the new user to the database
    await newUser.save();

    return { message: 'User created successfully', user: newUser };
  } catch (err) {
    throw new HttpError(err.message || 'Error creating user.', 500);
  }
};

// === Get All Users ===
const getAllUsers = async () => {
  try {
    // Retrieve all users without exposing passwords
    const users = await User.find().select('-password');
    return users;
  } catch (err) {
    throw new HttpError(err.message || 'Error fetching users.', 500);
  }
};

// === Update User ===
const updateUser = async (userId, { firstName, lastName, email, phoneNumber, role }) => {
  try {
    // Find the user by ID
    const user = await User.findOne({ userId });
    if (!user) {
      throw new HttpError('User not found.', 404);
    }

    // Update the user information
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (role && ['teacher', 'store', 'admin'].includes(role)) user.role = role;

    // Save the updated user
    await user.save();

    return { message: 'User updated successfully', user };
  } catch (err) {
    throw new HttpError(err.message || 'Error updating user.', 500);
  }
};

// === Delete User ===
const deleteUser = async (userId) => {
  try {
    // Find and delete the user by userId
    const user = await User.findOneAndDelete({ userId });
    if (!user) {
      throw new HttpError('User not found.', 404);
    }

    return { message: 'User deleted successfully' };
  } catch (err) {
    throw new HttpError(err.message || 'Error deleting user.', 500);
  }
};

module.exports = {
  login,
  createUser,
  getAllUsers,
  updateUser,
  deleteUser
};
