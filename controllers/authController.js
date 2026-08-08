const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const sendEmail = require('../utils/sendEmail');

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'foundit_super_secret_jwt_key_2026_x987', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};


exports.sendSignupOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please enter an email address' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already registered
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'An account with this email address already exists. Please sign in instead.' });
    }

    // Generate 6-digit random OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save or update OTP in Otp collection
    await Otp.deleteMany({ email: cleanEmail });
    await Otp.create({
      email: cleanEmail,
      otp: otpCode,
      expiresAt,
    });

    // Send HTML email
    const htmlEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #0284c7; margin: 0;">Foundit Security</h2>
          <p style="color: #64748b; font-size: 14px;">Signup Email Verification Code</p>
        </div>
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <p style="font-size: 14px; color: #334155; margin-bottom: 10px;">Your 6-digit Email Verification OTP Code is:</p>
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0284c7;">${otpCode}</span>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">This OTP code will expire in <strong>10 minutes</strong>. Enter this code on Foundit to verify your email and complete account setup.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">© 2026 Foundit Application. All rights reserved.</p>
      </div>
    `;

    const emailSent = await sendEmail({
      to: cleanEmail,
      subject: `Foundit - ${otpCode} is your Email Verification Code`,
      htmlText: htmlEmail,
      text: `Your Foundit 6-digit signup OTP is: ${otpCode}. It expires in 10 minutes.`,
    });

    if (emailSent) {
      return res.status(200).json({
        success: true,
        message: `6-Digit OTP Code sent to ${cleanEmail}`,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Error sending OTP email. Please check your email address or internet connection.',
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, otp } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    if (!otp) {
      return res.status(400).json({ success: false, message: 'Verification OTP code is required to complete registration' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Verify 6-digit OTP from Otp collection
    const validOtp = await Otp.findOne({
      email: cleanEmail,
      otp: otp.trim(),
      expiresAt: { $gt: Date.now() },
    });

    if (!validOtp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired 6-digit OTP code. Please request a new code.' });
    }

    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const user = await User.create({
      name,
      email: cleanEmail,
      password,
      phone: phone || '',
    });

    // Delete verified OTP record
    await Otp.deleteMany({ email: cleanEmail });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        photoUrl: user.photoUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.isDeleted) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated/deleted' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        photoUrl: user.photoUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Forgot Password - Send 6-digit OTP Email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please enter your email address' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No registered user found with this email address' });
    }

    // Generate random 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // Expires in 10 minutes

    user.resetPasswordOTP = otpCode;
    user.resetPasswordOTPExpires = otpExpiry;
    await user.save();

    // HTML Email template for 6-Digit OTP
    const htmlEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #0284c7; margin: 0;">Foundit Security</h2>
          <p style="color: #64748b; font-size: 14px;">Password Reset Verification Code</p>
        </div>
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <p style="font-size: 14px; color: #334155; margin-bottom: 10px;">Your 6-digit Verification OTP Code is:</p>
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0284c7;">${otpCode}</span>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">This OTP code will expire in <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">© 2026 Foundit Application. All rights reserved.</p>
      </div>
    `;

    // Send email using Nodemailer
    const emailSent = await sendEmail({
      to: user.email,
      subject: `Foundit - ${otpCode} is your Password Reset Code`,
      htmlText: htmlEmail,
      text: `Your Foundit 6-digit OTP is: ${otpCode}. It expires in 10 minutes.`,
    });

    if (emailSent) {
      res.status(200).json({
        success: true,
        message: `6-Digit OTP Code sent to ${user.email}`,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error sending OTP email. Please verify your internet connection or email address.',
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify 6-Digit OTP Code
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide email and OTP code' });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordOTP: otp,
      resetPasswordOTPExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired 6-digit OTP code' });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset Password using OTP
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide email, OTP, and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordOTP: otp,
      resetPasswordOTPExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP session' });
    }

    user.password = newPassword;
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Current User Profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
