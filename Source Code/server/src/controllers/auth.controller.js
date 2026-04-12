import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/user.model.js';
import { cacheSet, cacheDel } from '../config/redis.js';
import { sendVerificationEmail, sendResetPasswordEmail } from '../config/email.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};


// ================= REGISTER =================
export const register = async (req, res) => {
  try {
    const { username, email, password, gender } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }
    if (username.length < 3) {
      return res.status(400).json({ success: false, message: 'Username phải ít nhất 3 ký tự' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải ít nhất 6 ký tự' });
    }
    if (gender && !['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({ success: false, message: 'Giới tính không hợp lệ' });
    }

    // Chỉ kiểm tra email trùng, cho phép username trùng nhau
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email đã được sử dụng' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      username,
      email,
      password,
      gender: gender || 'other',
      isVerified: false,
      verificationToken,
      verificationExpire: Date.now() + 24 * 60 * 60 * 1000
    });

    const verifyLink = `http://localhost/api/auth/verify/${verificationToken}`;
    await sendVerificationEmail(user.email, verifyLink);

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công. Vui lòng xác thực email.',
      data: { user }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};


// ================= VERIFY EMAIL =================
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      verificationToken: token,
      verificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpire = undefined;
    await user.save();

    res.redirect(`${process.env.CLIENT_URL}login?verified=true`);

  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};


// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Email không tồn tại' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ success: false, message: 'Vui lòng xác thực email trước khi đăng nhập' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Mật khẩu không đúng' });
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user._id);
    await cacheSet(`user:${user._id}`, user, 3600);

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      data: { user, token }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};


// ================= GET CURRENT USER =================
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'username email avatar isOnline lastSeen')
      .populate('friendRequests.from', 'username email avatar');

    res.status(200).json({ success: true, data: user });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};


// ================= UPDATE PROFILE =================
export const updateProfile = async (req, res) => {
  try {
    const { username, bio, avatar } = req.body;
    const updateData = {};

    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true, runValidators: true });
    await cacheDel(`user:${req.user.id}`);

    res.status(200).json({ success: true, message: 'Cập nhật thành công', data: user });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};


// ================= CHANGE PASSWORD =================
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải ít nhất 6 ký tự' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }

    user.password = newPassword;
    await user.save();
    await cacheDel(`user:${req.user.id}`);

    res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};


// ================= FORGOT PASSWORD =================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu'
      });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}reset-password/${resetToken}`;
    await sendResetPasswordEmail(user.email, resetUrl);

    res.status(200).json({
      success: true,
      message: 'Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};


// ================= RESET PASSWORD =================
export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải ít nhất 6 ký tự' });
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Đặt lại mật khẩu thành công' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};