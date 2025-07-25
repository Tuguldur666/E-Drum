const { adminRegisterUser } = require('../services/adminService'); 

exports.registerUserByAdmin = async (req, res) => {
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Admin register teacher and store'
    #swagger.description = 'Admin register user'
    #swagger.parameters['Authorization'] = {
      in: 'header',
      name: 'Authorization',
      required: true,
      description: 'Bearer access token',
      type: 'string',
      example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        firstName:" ",
        lastName:" ",
        phoneNumber:" ",
        email:" ",
        password:" ",
        role:" "
      }
    }
  */
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    const { firstName, lastName, phoneNumber, email, password, role } = req.body;

    firstName = firstName?.trim();
    lastName = lastName?.trim();
    phoneNumber = phoneNumber?.trim();
    email = email?.trim().toLowerCase();
    role = role?.trim();

    const result = await adminRegisterUser(accessToken, {
      firstName,
      lastName,
      phoneNumber,
      email,
      password,
      role
    });

    return res.status(result.status || (result.success ? 200 : 400)).json(result);

  } catch (error) {
    console.error('❌ registerUserByAdmin Controller Error:', error);

    if (error.name === 'ValidationError') {
      return res.status(422).json({
        success: false,
        message: 'Validation failed. Please check submitted fields.',
      });
    }

    if (error.code === 11000) { 
      return res.status(409).json({
        success: false,
        message: 'Duplicate entry: email or phoneNumber already exists.',
      });
    }

    if (error.name === 'MongoNetworkError' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Database service unavailable. Please try again later.',
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Bad request while registering user.',
    });
  }
};
