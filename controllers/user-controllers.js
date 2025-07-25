const userServices = require('../services/user-services');

// === User Signup ===
const signup = async (req, res, next) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'User Signup'
    #swagger.description = 'Create a new user with phone number and password'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        phoneNumber: "string",
        password: "string"
      }
    }
  */
  try {
    const result = await userServices.signupService(req.body);
    res.status(201).json(result); 
  } catch (err) {
    next(err); // Pass to error handler middleware
  }
};

// === Handle Signup OTP: Verify or Resend ===
const handleSignupOtp = async (req, res, next) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Handle Signup OTP'
    #swagger.description = 'Verify or resend OTP for user signup'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        phoneNumber: "string",
        otp: "string"
      }
    }
  */
  try {
    const result = await userServices.handleSignupOtpService(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// === User Login ===
const login = async (req, res, next) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'User Login'
    #swagger.description = 'Login an existing user with phone number and password'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        phoneNumber: "string",
        password: "string"
      }
    }
  */
  try {
    const result = await userServices.loginService(req.body);
    res.json(result); // Send back user info and tokens
  } catch (err) {
    next(err);
  }
};

// === Refresh Access Token ===
const refreshAccessToken = async (req, res, next) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Refresh Access Token'
    #swagger.description = 'Refresh access token using a valid refresh token'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        refreshToken: "string"
      }
    }
  */
  try {
    const { refreshToken } = req.body;
    const result = await userServices.refreshAccessTokenService(refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// === Get User Data ===
const getUserData = async (req, res, next) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Get User Data'
    #swagger.description = 'Retrieve user data using the user ID'
    #swagger.parameters['id'] = {
      in: 'path',
      required: true,
      description: 'ID of the user to fetch data for',
      type: 'string',
      example: '123456'
    }
  */
  try {
    const userId = req.params.id;
    const result = await userServices.getUserDataService(userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// === Request OTP for Password Reset ===
const requestReset = async (req, res, next) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Request OTP for Password Reset'
    #swagger.description = 'Request OTP for resetting password using phone number'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        phoneNumber: "string"
      }
    }
  */
  try {
    const { phoneNumber } = req.body;
    const result = await userServices.requestResetService(phoneNumber);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// === Verify or Resend OTP for Password Reset ===
const verifyOrResendOtp = async (req, res, next) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Verify or Resend OTP for Password Reset'
    #swagger.description = 'Verify or resend OTP to reset the password'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        phoneNumber: "string",
        otp: "string"
      }
    }
  */
  try {
    const result = await userServices.verifyOrResendOtpService(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// === Reset Password ===
const resetPassword = async (req, res, next) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Reset Password'
    #swagger.description = 'Reset password using a valid reset token and new password'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        resetToken: "string",
        newPassword: "string"
      }
    }
  */
  try {
    const { resetToken, newPassword } = req.body;
    const result = await userServices.resetPasswordService(resetToken, newPassword);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// === Change User Password ===
const changeUserPassword = async (req, res, next) => {
  /*
    #swagger.tags = ['User']
    #swagger.summary = 'Change User Password'
    #swagger.description = 'Change the current password of the user'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        currentPassword: "string",
        newPassword: "string"
      }
    }
  */
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // Assuming you are using middleware to set user ID in request
    const result = await userServices.changeUserPasswordService(userId, currentPassword, newPassword);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  signup,
  handleSignupOtp,
  login,
  refreshAccessToken,
  getUserData,
  requestReset,
  verifyOrResendOtp,
  resetPassword,
  changeUserPassword
};
