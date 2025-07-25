const User = require('../models/user');
const otp = require('./otpService');
const { verifyToken } = require('../utils/token');
const axios = require('axios');
const Otp = require('../models/otp');
require('dotenv').config();

async function registerUser({ firstName, lastName, phoneNumber, email, password }) {
  try {

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

    const existingUnverifiedUser = await User.findOne({ phoneNumber, isVerified: false }).sort({ createdAt: -1 });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    let userToSave;

    if (existingUnverifiedUser) {
      existingUnverifiedUser.firstName = firstName;
      existingUnverifiedUser.lastName = lastName;
      existingUnverifiedUser.email = email;
      existingUnverifiedUser.password = password; 
      userToSave = existingUnverifiedUser;
    } else {
      userToSave = new User({
        firstName,
        lastName,
        phoneNumber,
        email,
        password, 
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

    return {
      success: true,
      message: 'User registered successfully. OTP sent.',
      userId: userToSave._id,
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
      return {
        success: false,
        message: 'Phone number and password are required.'
      };
    }

    const existingUser = await User.findOne({ phoneNumber, isVerified: true });
    if (!existingUser) {
      return {
        success: false,
        message: 'User not found or not verified.'
      };
    }

    const isMatch = await existingUser.comparePassword(password);
    if (!isMatch) {
      return {
        success: false,
        message: 'Invalid phone number or password.'
      };
    }

    const accessToken = existingUser.generateAccessToken();
    const refreshToken = existingUser.generateRefreshToken();

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
      message: 'Login failed due to a server error.'
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

async function sendMessage(userId, phoneNumber, code, authType) {
  console.log("authType in sendMessage:", authType);
  console.log("phoneNumber in sendMessage:", phoneNumber);

  try {
    const response = await axios.get(process.env.MESSAGE_API, {
      params: {
        key: process.env.MESSAGE_KEY,
        text: `${code} is your confirmation code for E-Drum`,
        to: phoneNumber,
        from: process.env.MESSAGE_PHONE_1,
      },
    });

    console.log('[OTP API Response]:', response.data);

    const result = Array.isArray(response.data)
      ? response.data[0]?.Result
      : response.data?.Result;

    if (result === 'SUCCESS') {
      await Otp.deleteMany({ userId, authType });
      console.log('[OTP DELETE] Existing codes removed');

      try {
        const otpDoc = await Otp.create({ userId, code, authType });
        console.log('[OTP CREATED]', otpDoc);
      } catch (createErr) {
        console.error('[OTP CREATE ERROR]', createErr);
        return false;
      }

      return true;
    } else {
      console.error('[OTP API Failure]', response.data);
      return false;
    }
  } catch (err) {
    console.error('[sendMessage Error]', err.response?.data || err.message);
    return false;
  }
}

// ////////////////////////////////////////////////////////////////////


async function verifyUserByOtp({ phoneNumber, code }) {
  try {
    const user = await User.findOne({ phoneNumber }).sort({ createdAt: -1 });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (user.isVerified) {
      return { success: true, message: 'User is already verified' };
    }

    const otpEntry = await Otp.findOne({
      userId: user._id,
      code,
      authType: 'verify',
    });

    if (!otpEntry) {
      return { success: false, message: 'Invalid or expired OTP' };
    }

    await Otp.deleteMany({ userId: user._id, authType: 'verify' });


    user.isVerified = true;
    await user.save();

    return { success: true, message: 'User verified successfully' };

  } catch (err) {
    console.error('Error verifying OTP:', err);
    return { success: false, message: 'OTP verification failed' };
  }
}

// /////////////////////////////////////////////////


async function forgotPassword({ phoneNumber }) {
  try {
    const user = await User.findOne({ phoneNumber, isVerified: true });
    if (!user) {
      return { success: false, message: 'Verified user with this phone number not found' };
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    const otpSent = await sendMessage(user._id, phoneNumber, otpCode, 'reset');
    if (!otpSent) {
      return {
        success: false,
        message: 'Failed to send OTP. Please try again later.',
      };
    }

    return {
      success: true,
      message: 'OTP sent successfully for password reset',
    };

  } catch (err) {
    console.error('Error in forgotPassword:', err);
    return {
      success: false,
      message: 'Failed to initiate password reset',
    };
  }
}


// //////////////////////////////////////////////////////////////


async function verifyResetOtp({ phoneNumber, code }) {
  try {

    const user = await User.findOne({ phoneNumber, isVerified: true })

    if (!user) {
      return { success: false, message: 'Verified user not found' };
    }

    const otpEntry = await Otp.findOne({
      userId: user._id,
      code,
      authType: 'reset'
    });

    if (!otpEntry) {
      return { success: false, message: 'Invalid or expired OTP' };
    }

    await Otp.deleteMany({ userId: user._id, authType: 'reset' });

    return {
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
      userId: user._id
    };

  } catch (err) {
    console.error('Error verifying reset OTP:', err);
    return { success: false, message: 'OTP verification failed' };
  }
}

// /////////////////////////////////////////////////


async function resetPass({ phoneNumber, newPassword }) {
  try {
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (!user.isVerified) {
      return {
        success: false,
        message: 'User is not verified. Password reset is not allowed.'
      };
    }

    user.password = newPassword;
    await user.save();

    return {
      success: true,
      message: 'Password reset successfully'
    };
  } catch (err) {

    console.error('Error resetting password:', err);
    
    return {
      success: false,
      message: 'Failed to reset password'
    };
  }
}

/////////////////////////////////////////

async function verifyChangePhoneOtp({ userId, code, authType }) {
  if (!['change_old', 'change_new'].includes(authType)) {
    return { success: false, message: 'Invalid authType for phone change' };
  }

  try {
    const otpEntry = await Otp.findOne({
      userId,
      code,
      authType,
    });

    if (!otpEntry) {
      return { success: false, message: 'Invalid or expired OTP' };
    }

    await Otp.deleteMany({ userId, authType });

    return {
      success: true,
      message: 'OTP verified successfully',
    };
  } catch (err) {
    console.error('Error verifying phone change OTP:', err);
    return { success: false, message: 'Failed to verify OTP' };
  }
}
/////////////////////////////////////////////////////////

async function sendChangePhoneOtp(userId, phoneNumber, authType) {
  if (!['change_old', 'change_new'].includes(authType)) {
    return { success: false, message: 'Invalid authType for phone change' };
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const sent = await sendMessage(userId, phoneNumber, otpCode, authType);

  if (!sent) {
    return {
      success: false,
      message: `Failed to send OTP to ${authType === 'change_old' ? 'current' : 'new'} phone`,
    };
  }

  return {
    success: true,
    message: `OTP sent to ${authType === 'change_old' ? 'current' : 'new'} phone number`,
  };
}



module.exports = {
  verifyUserByOtp,
  sendMessage,
  forgotPassword,
  verifyResetOtp,
  resetPass,
  verifyChangePhoneOtp,
  sendChangePhoneOtp
}





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
