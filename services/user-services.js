const User = require("../models/user-model");
const HttpError = require("../middleware/http-error");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Otp = require('../models/otp-model');
const { sendMessage } = require("../utils/messageSender");

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); 
};

// === User Signup ===
const signupService = async ({ firstName, lastName, email, phoneNumber, password, role = "student" }) => {
  if (!firstName || !lastName || !phoneNumber || !password) {
    throw new HttpError("All fields are required.", 400);
  }

  const normalizedEmail = email.toLowerCase();

  const existingUser = await User.findOne({
    $or: [{ email: normalizedEmail }, { phoneNumber }],
  });

  if (existingUser) {
    throw new HttpError("User already exists.", 422);
  }

  const userId = Math.floor(Math.random() * 9000000) + 1000000;

  const newUser = new User({
    firstName,
    lastName,
    email: normalizedEmail,
    phoneNumber,
    password,  
    role,
    isVerified: false,
    score: 0,
    lastLogin: null,
    userId  
  });

  await newUser.save();

  const otp = generateOtp();

  await Otp.create({ number: phoneNumber, otp });

  const messageSent = await sendMessage(phoneNumber, otp);
  if (!messageSent) {
    throw new HttpError("Failed to send OTP.", 503);
  }

  return { message: "Signup successful. OTP sent to phone." };
};

// === SIGNUP OTP: VERIFY & RESEND ===
const handleSignupOtpService = async ({ phoneNumber, otp, action }) => {
  if (!phoneNumber) throw new HttpError("Phone number is required.", 400);

  const user = await User.findOne({ phoneNumber });
  if (!user) throw new HttpError("User not found.", 404);
  if (user.isVerified) throw new HttpError("User already verified.", 400);

  if (action === "verify") {
    if (!otp) throw new HttpError("OTP is required for verification.", 400);

    const otpRecord = await Otp.findOne({ number: phoneNumber, otp });
    if (!otpRecord) throw new HttpError("Invalid or expired OTP.", 400);

    const isExpired = Date.now() - new Date(otpRecord.createdAt).getTime() > 60 * 1000;
    if (isExpired) {
      await Otp.deleteMany({ number: phoneNumber });
      throw new HttpError("OTP expired.", 400);
    }

    const updatedUser = await User.findOneAndUpdate(
      { phoneNumber },
      { isVerified: true },
      { new: true }
    );
    await Otp.deleteMany({ number: phoneNumber });

    const accessToken = updatedUser.generateAccessToken();
    const refreshToken = updatedUser.generateRefreshToken();

    return {
      message: "Phone number verified successfully.",
      accessToken,
      refreshToken,
      user: updatedUser.toObject({ getters: true }),
    };
  }

  if (action === "resend") {
    const existingOtp = await Otp.findOne({ number: phoneNumber });
    if (existingOtp) {
      const timeSinceLastOtp = Date.now() - new Date(existingOtp.createdAt).getTime();
      if (timeSinceLastOtp < 60 * 1000) {
        throw new HttpError("Please wait before requesting a new OTP.", 429);
      }
      await Otp.deleteMany({ number: phoneNumber });
    }

    const newOtp = generateOtp();
    await Otp.create({ number: phoneNumber, otp: newOtp });

    const messageSent = await sendMessage(phoneNumber, newOtp);
    if (!messageSent) throw new HttpError("Failed to send OTP.", 503);

    return { message: "OTP resent successfully." };
  }

  throw new HttpError("Invalid action type.", 400);
};

// === User Login ===
const loginService = async ({ phoneNumber, password }) => {
  if (!phoneNumber) {
    throw new HttpError("Phone number is required.", 400);
  }

  if (!password) {
    throw new HttpError("Password is required.", 400);
  }

  const user = await User.findOne({ phoneNumber });

  if (!user) {
    throw new HttpError("User not found.", 404);
  }

  if (!user.isVerified) {
    throw new HttpError("Account not verified. Please verify your phone number.", 401);
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    throw new HttpError("Invalid credentials.", 401);
  }

  user.lastLogin = Date.now();
  await user.save();

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  return {
    message: "Login successful",
    user: user.toObject({ getters: true }),
    accessToken,
    refreshToken,
  };
};

// === REFRESH TOKEN ===
const refreshAccessTokenService = async (refreshToken) => {
  if (!refreshToken) throw new HttpError("Refresh token required.", 401);

  const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  if (!decoded) throw new HttpError("Invalid refresh token.", 403);

  const user = await User.findById(decoded.id);
  if (!user) throw new HttpError("User not found.", 404);

  const accessToken = user.generateAccessToken("10m");
  const newRefreshToken = user.generateRefreshToken();

  return { accessToken, refreshToken: newRefreshToken };
};

// === GET USER BY ID ===
const getUserDataService = async (userId) => {
  if (!userId) throw new HttpError("User ID missing.", 400);

  const user = await User.findById(userId);
  if (!user) throw new HttpError("User not found.", 404);

  return { user: user.toObject({ getters: true }) };
};

// === Request reset OTP ===
const requestResetService = async (phoneNumber) => {
  if (!phoneNumber) throw new HttpError("Phone number is required.", 400);

  const user = await User.findOne({ phoneNumber });
  if (!user) throw new HttpError("User not found.", 404);

  const existingOtp = await Otp.findOne({ number: phoneNumber });

  if (existingOtp) {
    const timeSinceLastOtp = Date.now() - new Date(existingOtp.createdAt).getTime();

    if (timeSinceLastOtp < 30 * 1000) {
      throw new HttpError("Please wait before requesting a new OTP.", 429);
    }

    await Otp.deleteMany({ number: phoneNumber });
  }

  const newOtp = generateOtp();

  await Otp.create({ number: phoneNumber, otp: newOtp });

  const messageSent = await sendMessage(phoneNumber, newOtp);
  if (!messageSent) {
    throw new HttpError("Failed to send OTP.", 503);
  }

  return { message: "OTP sent for password reset." };
};

// === Handle Verify/Resend OTP for Password Reset ===
const verifyOrResendOtpService = async ({ phoneNumber, otp, action }) => {
  if (!phoneNumber) throw new HttpError("Phone number is required.", 400);
  if (!action) throw new HttpError("Action is required.", 400);

  const user = await User.findOne({ phoneNumber });
  if (!user) throw new HttpError("User not found.", 404);

  if (action === "verify") {
    if (!otp) throw new HttpError("OTP is required for verification.", 400);

    const otpRecord = await Otp.findOne({ number: phoneNumber, otp });
    if (!otpRecord) throw new HttpError("Invalid or expired OTP.", 400);

    const isExpired = Date.now() - new Date(otpRecord.createdAt).getTime() > 60 * 1000; 
    if (isExpired) {
      await Otp.deleteMany({ number: phoneNumber });
      throw new HttpError("OTP expired.", 400);
    }

    const resetToken = user.generateResetPasswordToken();
    await Otp.deleteMany({ number: phoneNumber });

    return { message: "OTP verified.", resetToken };
  }

  if (action === "resend") {
    const existingOtp = await Otp.findOne({ number: phoneNumber });
    if (existingOtp) {
      const timeSinceLastOtp = Date.now() - new Date(existingOtp.createdAt).getTime();
      if (timeSinceLastOtp < 60 * 1000) { 
        throw new HttpError("Please wait before requesting a new OTP.", 429);
      }

      await Otp.deleteMany({ number: phoneNumber });
    }

    const newOtp = generateOtp();
    await Otp.create({ number: phoneNumber, otp: newOtp });

    const messageSent = await sendMessage(phoneNumber, newOtp);
    if (!messageSent) throw new HttpError("Failed to send OTP.", 503);

    return { message: "OTP resent successfully." };
  }

  throw new HttpError("Invalid action.", 400);
};

// === RESET PASSWORD ===
const resetPasswordService = async (resetToken, newPassword) => {
  if (!resetToken || !newPassword) {
    throw new HttpError("Reset token and new password are required.", 400);
  }

  const decodedToken = jwt.verify(resetToken, process.env.RESET_PASSWORD_TOKEN_SECRET);
  if (!decodedToken) {
    throw new HttpError("Invalid or expired reset token.", 400);
  }

  const user = await User.findOne({ phoneNumber: decodedToken.phoneNumber });
  if (!user) {
    throw new HttpError("User not found.", 404);
  }

  user.password = newPassword; 
  await user.save();

  return { message: "Password updated successfully." };
};

// === Change User Password ===
const changeUserPasswordService = async (userId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) {
    throw new HttpError("Current and new password are required.", 400);
  }

  const user = await User.findById(userId);
  if (!user) throw new HttpError("User not found.", 404);

  const isValid = await user.comparePassword(currentPassword);
  if (!isValid) throw new HttpError("Incorrect current password.", 401);

  user.password = newPassword;
  await user.save();

  return { message: "Password changed successfully." };
};

module.exports = {
  signupService,
  handleSignupOtpService,
  loginService,
  refreshAccessTokenService,
  getUserDataService,
  requestResetService,
  verifyOrResendOtpService,
  resetPasswordService,
  changeUserPasswordService,
};
