const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin-controllers');
const { isAdmin } = require('../middleware/authorize'); 
const verifyToken = require('../middleware/verifyToken');

router.post('/login', adminController.loginUser); 

router.post('/create', verifyToken, isAdmin, adminController.createNewUser); 
router.get('/users', verifyToken,  isAdmin, adminController.getUsers); 
router.put('/user/:userId', verifyToken,  isAdmin, adminController.updateUserInfo); 
router.delete('/user/:userId', verifyToken,  isAdmin, adminController.deleteUserById); 

module.exports = router;
