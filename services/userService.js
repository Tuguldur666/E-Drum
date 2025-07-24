const User = require('../models/user');
const otp = require('./otpService');
const bcrypt = require('bcrypt');

async function registerUser({ firstName, lastName, phoneNumber, email, password }) {
  try {
    firstName = firstName?.trim();
    lastName = lastName?.trim();
    phoneNumber = phoneNumber?.trim();
    email = email?.trim().toLowerCase();

    if (!firstName || !lastName || !phoneNumber || !email || !password) {
      return { success: false, message: 'All fields are required.' };
    }

    const verifiedPhoneUser = await User.findOne({ phoneNumber, isVerified: true });
    if (verifiedPhoneUser) {
      return { success: false, message: 'User already exists with this phone number.' };
    }

    const verifiedEmailUser = await User.findOne({ email, isVerified: true });
    if (verifiedEmailUser) {
      return { success: false, message: 'User already exists with this email address.' };
    }

    const existingUnverifiedUser = await User.findOne({
      phoneNumber,
      isVerified: false
    }).sort({ createdAt: -1 });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    let userToSave;

    if (existingUnverifiedUser) {
      existingUnverifiedUser.firstName = firstName;
      existingUnverifiedUser.lastName = lastName;
      existingUnverifiedUser.email = email;

      if (password) {
        const salt = await bcrypt.genSalt(10);
        existingUnverifiedUser.password = await bcrypt.hash(password, salt);
      }

      userToSave = existingUnverifiedUser;
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      userToSave = new User({
        firstName,
        lastName,
        phoneNumber,
        email,
        password: hashedPassword,
        isVerified: false,
        createdAt: new Date() 
      });
    }

    await userToSave.save();

    const otpSent = await otp.sendMessage(userToSave._id, phoneNumber, otpCode, 'verify');
    if (!otpSent) {
      return {
        success: false,
        message: 'Failed to send OTP. Registration aborted.'
      };
    }

    const accessToken = userToSave.generateAccessToken();
    const refreshToken = userToSave.generateRefreshToken();

    return {
      success: true,
      message: 'User registered successfully. OTP sent.',
      userId: userToSave._id,
      accessToken,
      refreshToken
    };

  } catch (error) {
    console.error('❌ registerUser Error:', error);
    return {
      success: false,
      message: 'Registration failed due to server error.'
    };
  }
}

///////////////////// Register ////////////////////////////

async function loginUser({ phoneNumber, password }) {
  try {
    if (!phoneNumber || !password) {
      return { success: false, message: 'Phone number and password are required.' };
    }

    const user = await User.findOne({ phoneNumber, isVerified: true });
    if (!user) {
      return { success: false, message: 'User not found or not verified.' };
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return { success: false, message: 'Invalid credentials.' };
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    return {
      success: true,
      message: 'Login successful.',
      accessToken,
      refreshToken
    };

  } catch (error) {
    console.error('❌ loginUser Error:', error);
    return {
      success: false,
      message: 'Login failed due to server error.'
    };
  }
}
////////////////////////// Login ////////////////////////

async function refreshToken(req) {
  const refreshToken = req.headers['x-refresh-token'];

  if (!refreshToken) {
    return { success: false, status: 401, message: 'Refresh token missing' };
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);


    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return { success: false, status: 403, message: 'User not found' };
    }

    if (!user.isVerified) {
      return { success: false, status: 403, message: 'User account not verified' };
    }

    const newAccessToken = user.generateAccessToken();

    return {
      success: true,
      status: 200,
      accessToken: newAccessToken
    };
  } catch (err) {
    return { success: false, status: 403, message: 'Invalid or expired refresh token' };
  }
}
///////////////////////// Refresh token //////////////////////////////////////////////////

async function getUserData(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, status: 401, message: 'Access token missing or malformed' };
  }

  const token = authHeader.split(' ')[1].trim();

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return { success: false, status: 404, message: 'User not found' };
    }

    return {
      success: true,
      status: 200,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        score: user.score
      }
    };
  } catch (err) {
    return { success: false, status: 403, message: 'Invalid or expired access token' };
  }
}
///////////////////////// Get user Data ///////////////////////////////////////////////

async function sendOtpToCurrentPhone(accessToken) {
  const decoded = verifyToken(accessToken);
  if (!decoded?.userId) {
    return { success: false, message: 'Invalid access token' };
  }

  const user = await User.findById(decoded.userId);
  if (!user) return { success: false, message: 'User not found' };

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const sent = await otp.sendMessage(user._id, user.phoneNumber, otpCode, 'change_old');

  if (!sent) {
    return { success: false, message: 'Failed to send OTP to current number' };
  }

  return { success: true, message: 'OTP sent to current phone number' };
}

///////////////////////////////// Send OTP to current number ///////////////

async function verifyCurrentPhoneOtp(accessToken, enteredOtp) {
  const decoded = verifyToken(accessToken);
  if (!decoded?.userId) {
    return { success: false, message: 'Invalid access token' };
  }

  const user = await User.findById(decoded.userId);
  if (!user) return { success: false, message: 'User not found' };

  const isValidOtp = await otp.verifyChangePhoneOtp({
    userId: user._id,
    code: enteredOtp,
    authType: 'change_old',
  });

  if (!isValidOtp.success) {
    return { success: false, message: 'Invalid OTP for current number' };
  }

  return { success: true, message: 'Current number verified. You can now enter a new number.' };
}
/////////////////////// Confirm current phone number ////////////////////////////////////////////////////

async function sendOtpToNewPhone(accessToken, newPhoneNumber) {
  const decoded = verifyToken(accessToken);
  if (!decoded?.userId) {
    return { success: false, message: 'Invalid access token' };
  }

  const user = await User.findById(decoded.userId);
  if (!user) return { success: false, message: 'User not found' };

  const existing = await User.findOne({ phoneNumber: newPhoneNumber, isVerified: true });
  if (existing) return { success: false, message: 'Phone number already in use' };

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const sent = await otp.sendMessage(user._id, newPhoneNumber, otpCode, 'change_new');

  if (!sent) {
    return { success: false, message: 'Failed to send OTP to new number' };
  }

  return { success: true, message: 'OTP sent to new phone number' };
}
//////////////////////// Enter new phone number //////////////////////

async function verifyNewPhoneAndUpdate(accessToken, newPhoneNumber, enteredOtp) {
  const decoded = verifyToken(accessToken);
  if (!decoded?.userId) {
    return { success: false, message: 'Invalid access token' };
  }

  const user = await User.findById(decoded.userId);
  if (!user) return { success: false, message: 'User not found' };

  const existing = await User.findOne({
    phoneNumber: newPhoneNumber,
    isVerified: true,
    _id: { $ne: decoded.userId }
  });

  if (existing) return { success: false, message: 'Phone number already in use' };

  const isValidOtp = await otp.verifyChangePhoneOtp({
    userId: user._id,
    code: enteredOtp,
    authType: 'change_new',
  });

  if (!isValidOtp.success) {
    return { success: false, message: 'Invalid OTP for new number' };
  }

  const updated = await User.updateOne(
    { _id: user._id },
    { $set: { phoneNumber: newPhoneNumber } }
  );

  if (updated.modifiedCount === 0) {
    return { success: false, message: 'Phone number not updated' };
  }

  return {
    success: true,
    message: 'Phone number updated successfully',
    user: {
      id: user._id,
      name: user.name,
      phoneNumber: newPhoneNumber
    }
  };
}
/////////////////// Update phone number ////////////////////////////////////

async function verifyCurrentPassword(accessToken, currentPassword) {
  if (!accessToken || !currentPassword) {
    return {
      success: false,
      message: 'Access token and current password are required',
    };
  }

  const { userId, error } = verifyToken(accessToken);
  if (error) {
    return { success: false, message: 'Invalid access token' };
  }

  try {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return { success: false, message: 'Current password is incorrect' };
    }

    return {
      success: true,
      message: 'Current password verified. You may now change your password.',
    };
  } catch (err) {
    console.error('Error verifying current password:', err);
    return {
      success: false,
      message: 'Password verification failed. Please try again later.',
    };
  }
}
/////////////////////////////// Verify current password /////////////////////////////////

async function changeToNewPassword(accessToken, newPassword) {
  if (!accessToken || !newPassword) {
    return {
      success: false,
      message: 'Access token and new password are required',
    };
  }

  const { userId, error } = verifyToken(accessToken);
  if (error) return { success: false, message: 'Invalid access token' };

  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    user.password = newPassword;
    await user.save();

    return {
      success: true,
      message: 'Password updated successfully',
    };
  } catch (err) {
    console.error('Error changing to new password:', err);
    return {
      success: false,
      message: 'Failed to update password',
    };
  }
}
/////////////////// Change new password //////////////////////




module.exports = { registerUser, 
                    loginUser ,
                    refreshToken,
                    getUserData,
                    sendOtpToCurrentPhone,
                    verifyCurrentPhoneOtp,
                    sendOtpToNewPhone,
                    verifyNewPhoneAndUpdate,
                    verifyCurrentPassword,
                    changeToNewPassword
                 }
