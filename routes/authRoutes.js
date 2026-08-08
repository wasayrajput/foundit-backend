const express = require('express');
const {
  sendSignupOtp,
  register,
  login,
  forgotPassword,
  verifyOTP,
  resetPassword,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/send-signup-otp', sendSignupOtp);
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
