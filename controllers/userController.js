const service = require('../services/userService'); 


exports.registerUser = async (req, res) => {
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'User Registration'
    #swagger.description = 'Registers a new user with firstName, lastName, email, phoneNumber, and password'
    #swagger.parameters['body'] = {
        in: 'body',
        required: true,
        schema: {
            firstName: " ",
            lastName: " ",
            email: " ",
            phoneNumber: " ",
            password: " "
        }
    }
  */
  try {
    let { firstName, lastName, email, phoneNumber, password } = req.body;

    firstName = firstName?.trim();
    lastName = lastName?.trim();
    email = email?.trim().toLowerCase();
    phoneNumber = phoneNumber?.trim();
    password = password?.trim();

    if (!firstName || !lastName || !email || !phoneNumber || !password) {
      return res.status(422).json({
        success: false,
        message: "Missing required fields: firstName, lastName, email, phoneNumber, or password",
      });
    }

    const result = await service.registerUser({ firstName, lastName, email, phoneNumber, password });

    if (result.success) {
      res.set('x-refresh-token', result.refreshToken);

      return res.status(201).json({
        success: true,
        message: result.message,
        accessToken: result.accessToken
      });
    }

    return res.status(409).json({
      success: false,
      message: result.message || "User already exists",
    });

  } catch (err) {
    console.error("Registration service failure:", err);

    if (err.code === 'ECONNREFUSED' || err.name === 'MongoNetworkError') {
      return res.status(503).json({
        success: false,
        message: "Service temporarily unavailable. Please try again later.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Bad request. Please verify your data and try again.",
    });
  }
};
////////////////// Register Controller /////////////////////////

exports.login = async (req, res) => {
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'User login'
    #swagger.description = 'Logs in a user with phoneNumber and password'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        phoneNumber: " ",
        password: " "
      }
    }
  */
  try {
    let { phoneNumber, password } = req.body;

    phoneNumber = phoneNumber?.trim();
    password = password?.trim();

    if (!phoneNumber || !password) {
      return res.status(422).json({
        success: false,
        message: "Missing phoneNumber or password",
      });
    }

    const result = await service.loginUser({ phoneNumber, password });

    if (!result.success) {
      if (result.message && /not verified/i.test(result.message)) {
        return res.status(403).json({
          success: false,
          message: result.message,
        });
      }

      return res.status(401).json({
        success: false,
        message: result.message || "Invalid credentials",
      });
    }

    res.set('x-refresh-token', result.refreshToken);

    return res.status(200).json({
      success: true,
      message: result.message,
      accessToken: result.accessToken
    });

  } catch (err) {
    console.error("Login service error:", err);

    if (err.code === 'ECONNREFUSED' || err.name === 'MongoNetworkError') {
      return res.status(503).json({
        success: false,
        message: "Service temporarily unavailable. Please try again later.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Bad request. Please verify your data and try again.",
    });
  }
};
////////////////////////// Login Controller ////////////////////

exports.refreshToken = async (req, res) => {
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Refresh Access Token'
    #swagger.description = 'Returns a new access token given a valid refresh token.'
    #swagger.parameters['x-refresh-token'] = {
      in: 'header',
      description: 'Refresh token to issue a new access token',
      required: true,
      type: 'string',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  */

  try {
    const result = await service.refreshToken(req);

    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message
      });
    }

    return res.status(200).json({
      success: true,
      accessToken: result.accessToken
    });

  } catch (err) {
    console.error('Unexpected error in refreshToken controller:', err);

    return res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable. Please try again later.'
    });
  }
};
///////////////////////// Refresh Token Contoller ///////////////////////////

exports.getUserData = async (req, res) => {
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Get user data'
    #swagger.description = 'Returns user details from access token. Token is passed in the Authorization header.'
    #swagger.parameters['Authorization'] = {
      in: 'header',
      name: 'Authorization',
      description: 'Bearer access token',
      required: true,
      type: 'string',
      example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  */

  try {
    const result = await service.getUserData(req);

    if (!result.success) {
      return res.status(result.status || 401).json({
        success: false,
        message: result.message || "Unauthorized or token invalid",
      });
    }

    return res.status(result.status || 200).json({
      success: true,
      user: result.user,
    });

  } catch (err) {
    console.error("getUserData error:", err.message);

    return res.status(503).json({
      success: false,
      message: "Service temporarily unavailable. Please try again later.",
    });
  }
};
//////////////////////// Get User Data Contoller ///////////////////////////

exports.sendOtpToCurrentPhone = async (req, res) => {
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Initiate phone number change'
    #swagger.description = 'Sends an OTP to the user’s current phone number to confirm ownership.'
    #swagger.parameters['Authorization'] = {
      in: 'header',
      name: 'Authorization',
      required: true,
      description: 'Bearer access token',
      type: 'string',
      example: 'Bearer ...'
    }
  */
  try {
    const token = req.headers.authorization;
    const result = await service.sendOtpToCurrentPhone(token);

    if (!result.success) {
      return res.status(401).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(503).json({ success: false, message: "Service unavailable" });
  }
};
/////////////////// Send OTP to Current Number Controller ////////////////////////////////

exports.verifyCurrentPhoneOtp = async (req, res) => {
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Verify old phone OTP'
    #swagger.description = 'Verifies OTP on old number.'
    #swagger.parameters['Authorization'] = { in: 'header', name: 'Authorization', required: true, description: 'Bearer token' }
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        otp: " "
      }
    }
  */
  try {
    const token = req.headers.authorization;
    const { otp } = req.body;

    const result = await service.verifyCurrentPhoneOtp(token, otp);

    if (!result.success) {
      return res.status(401).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(503).json({ success: false, message: "Service unavailable" });
  }
};
////////////////////// Verify Current Number By OTP Controller //////////////////////////////////

exports.sendOtpToNewPhone = async (req, res) => {
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Send OTP to new phone'
    #swagger.description = ' Sends OTP to new number.'
    #swagger.parameters['Authorization'] = { in: 'header', name: 'Authorization', required: true, description: 'Bearer token' }
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        newPhoneNumber: " "
      }
    }
  */
  try {
    const token = req.headers.authorization;
    const { newPhoneNumber } = req.body;

    const result = await service.sendOtpToNewPhone(token, newPhoneNumber);

    if (!result.success) {
      return res.status(409).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(503).json({ success: false, message: "Service unavailable" });
  }
};
/////////////////////Get and  Send OTP to New Phone Number Controller ////////////////
exports.verifyNewPhoneAndUpdate = async (req, res) => {
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Verify old phone OTP and send OTP to new phone'
    #swagger.description = 'Verifies OTP on old number, then sends OTP to new number.'
    #swagger.parameters['Authorization'] = { in: 'header', name: 'Authorization', required: true, description: 'Bearer token' }
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        otp: " ",
        newPhoneNumber: " "
      }
    }
  */
  try {
    const token = req.headers.authorization;
    const { newPhoneNumber, otp } = req.body;

    const result = await service.verifyNewPhoneAndUpdate(token, newPhoneNumber, otp);

    if (!result.success) {
      return res.status(401).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(503).json({ success: false, message: "Service unavailable" });
  }
};
/////////////// Verify and Update New Phone Number Controller /////////////////////////

exports.verifyCurrentPassword = async (req, res) => {

    /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Update current phone number'
    #swagger.description = 'Updates the phone number.'
    #swagger.parameters['Authorization'] = {
      in: 'header',
      name: 'Authorization',
      required: true,
      description: 'Bearer access token',
      type: 'string',
      example: 'Bearer ...'
    }
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        currentPassword:" "

      }
    }
  */

  const authHeader = req.headers.authorization;
  const { currentPassword } = req.body;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  if (!currentPassword){ 
    return res.status(422).json({ success: false, message: 'Field is missing' });
  }

  const accessToken = authHeader.split(' ')[1];


  const result = await  service.verifyCurrentPassword(accessToken,currentPassword)
  res.status(result.success ? 200 : 400).json(result);

}
//////////////////// Verify Current Password Controller /////////////////////////////////////


exports.changeToNewPassword = async (req, res) => {

      /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Update current phone number'
    #swagger.description = 'Updates the phone number.'
    #swagger.parameters['Authorization'] = {
      in: 'header',
      name: 'Authorization',
      required: true,
      description: 'Bearer access token',
      type: 'string',
      example: 'Bearer ...'
    }
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        newPassword:" "

      }
    }
  */

  const authHeader = req.headers.authorization;
  const { newPassword } = req.body;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  if (!newPassword){ 
    return res.status(422).json({ success: false, message: 'Field is missing' });
  }

  const accessToken = authHeader.split(' ')[1];

  const result = await service.changeToNewPassword(accessToken, newPassword);
  res.status(result.success ? 200 : 400).json(result);

};

/////////// Update New Password Controller ////////////////////////////////////////
