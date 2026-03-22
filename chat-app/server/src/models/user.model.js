import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto'; // ✅ đúng chỗ

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },

  // ===== EMAIL VERIFICATION =====

  isVerified: {
    type: Boolean,
    default: false
  },

  verificationToken: {
    type: String
  },

  verificationExpire: {
    type: Date
  },
  // ===== RESET PASSWORD =====
  resetPasswordToken: {
    type: String
  },

  resetPasswordExpire: {
    type: Date
  },
  // ===== USER INFO =====

  avatar: {
    type: String,
    default: 'https://ui-avatars.com/api/?name=User&background=random'
  },

  bio: {
    type: String,
    maxlength: 200,
    default: ''
  },

  isOnline: {
    type: Boolean,
    default: false
  },

  lastSeen: {
    type: Date,
    default: Date.now
  },

  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  friendRequests: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]

}, {
  timestamps: true
});

// Hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Reset password token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);
export default User;
