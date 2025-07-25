const express = require('express');
const userController = require('../controllers/user-controllers');
const verifyToken = require('../middleware/verifyToken');
const router = express.Router();

router.post('/register', userController.signup);
router.post('/verify-signup-otp', userController.handleSignupOtp); 
router.post('/login', userController.login);
router.post('/refreshToken', userController.refreshAccessToken);
router.get('/getUser', userController.getUserData);
router.post('/request-reset', userController.requestReset);
router.post('/verify-reset-otp', userController.verifyOrResendOtp);
router.post('/reset-password', userController.resetPassword);
router.post('/change-password', verifyToken, userController.changeUserPassword);

module.exports = router;
