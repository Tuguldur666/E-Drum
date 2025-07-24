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
    return res.status(500).json({
      success: false,
      message: 'Internal server error while registering user'
    });
  }
};
