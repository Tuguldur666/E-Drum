const adminServices = require('../services/admin-services');

// === Login User ===
const loginUser = async (req, res, next) => {
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Login user'
    #swagger.description = 'Admin logs in to the system'
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
    // Handle the login logic through service layer
    const result = await adminServices.login(req.body);
    res.status(200).json(result); // Return the result with status 200 (OK)
  } catch (err) {
    next(err); // Forward any errors to the error handler
  }
};

// === Create User ===
const createNewUser = async (req, res, next) => {
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Create new user'
    #swagger.description = 'Create a new user in the system'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        firstName: "string",
        lastName: "string",
        phoneNumber: "string",
        email: "string",
        password: "string",
        role: "string"
      }
    }
  */
  try {
    const result = await adminServices.createUser(req.body);
    res.status(201).json(result); // Return the result with status 201 (Created)
  } catch (err) {
    next(err); // Forward any errors to the error handler
  }
};

// === Get All Users ===
const getUsers = async (req, res, next) => {
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Get all users'
    #swagger.description = 'Retrieve all users from the system'
  */
  try {
    const result = await adminServices.getAllUsers();
    res.status(200).json(result); // Return the list of users with status 200 (OK)
  } catch (err) {
    next(err); // Forward any errors to the error handler
  }
};


// === Update User ===
const updateUserInfo = async (req, res, next) => {
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Update user info'
    #swagger.description = 'Update user information in the system'
    #swagger.parameters['userId'] = {
      in: 'path',
      required: true,
      description: 'ID of the user to update',
      type: 'string',
      example: '1234567'
    }
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        firstName: "string",
        lastName: "string",
        phoneNumber: "string",
        email: "string",
        role: "string"
      }
    }
  */
  try {
    const { userId } = req.params;
    const result = await adminServices.updateUser(userId, req.body);
    res.status(200).json(result); // Return the updated user information with status 200 (OK)
  } catch (err) {
    next(err); // Forward any errors to the error handler
  }
};

// === Delete User ===
const deleteUserById = async (req, res, next) => {
  /*
    #swagger.tags = ['Admin']
    #swagger.summary = 'Delete user'
    #swagger.description = 'Delete a user from the system'
    #swagger.parameters['userId'] = {
      in: 'path',
      required: true,
      description: 'ID of the user to delete',
      type: 'string',
      example: '1234567'
    }
  */
  try {
    const { userId } = req.params;
    const result = await adminServices.deleteUser(userId);
    res.status(200).json(result); // Return success message with status 200 (OK)
  } catch (err) {
    next(err); // Forward any errors to the error handler
  }
};

module.exports = {
  loginUser,
  createNewUser,
  getUsers,
  updateUserInfo,
  deleteUserById
};
