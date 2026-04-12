import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    default: null
  },
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  category: {
    type: String,
    enum: [
      'spam',
      'scam',
      'harassment',
      'hate_speech',
      'impersonation',
      'violence',
      'nudity',
      'other'
    ],
    required: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'rejected'],
    default: 'pending',
    index: true
  },
  adminNote: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  handledAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

reportSchema.index({ createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);
export default Report;
