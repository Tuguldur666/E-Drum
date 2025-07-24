const express = require('express');
const router = express.Router();
const userController = require("../controllers/userController");

// Registration & Auth
router.post('/register', userController.registerUser);
router.post('/login', userController.login);
router.post('/refreshToken', userController.refreshToken);

// User data
router.get('/getuser', userController.getUserData);

// Phone number change 
router.post('/phone/send-otp-current', userController.sendOtpToCurrentPhone);
router.post('/phone/verify-current-otp', userController.verifyCurrentPhoneOtp);
router.post('/phone/send-otp-new', userController.sendOtpToNewPhone);
router.post('/phone/verify-and-update', userController.verifyNewPhoneAndUpdate);

// Password Change 
router.post('/password/verifyCurrentPassword', userController.verifyCurrentPassword);
////////////////////////////////////
router.post('/password/changePassword', userController.changeToNewPassword);
////////////////////////////////////
module.exports = router;
