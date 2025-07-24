const express = require('express');
const router = express.Router();
const adminController = require("../controllers/adminController");

// Teacher and store register by admin
router.post('/adminRegister', adminController.registerUserByAdmin);

module.exports = router;