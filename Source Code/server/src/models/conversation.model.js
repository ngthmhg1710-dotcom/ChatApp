import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['private', 'group', 'community'],
    default: 'private'
  },
  isGroup: {
    type: Boolean,
    default: false
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  formerParticipants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  formerParticipantMeta: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    leftAt: {
      type: Date,
      required: true
    },
    // Thời điểm bị kick / tự rời — dùng để cắt lịch sử hiển thị
    historyVisibleUntil: {
      type: Date,
      default: null
    }
  }],
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  permissions: {
    allowMembersAddParticipants: {
      type: Boolean,
      default: true
    }
  },
  avatar: {
    type: String,
    default: ''
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  pinnedMessages: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true
  },
  dissolvedAt: {
    type: Date,
    default: null
  },
  dissolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Dùng cho nhóm đã giải tán: cutoff chung cho tất cả former members
  historyVisibleUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ formerParticipants: 1 });
conversationSchema.index({ 'formerParticipantMeta.user': 1 });
conversationSchema.index({ updatedAt: -1 });

conversationSchema.statics.findPrivateConversation = async function(user1Id, user2Id) {
  return await this.findOne({
    type: 'private',
    participants: { $all: [user1Id, user2Id], $size: 2 }
  });
};

conversationSchema.statics.findPersonalConversation = async function(userId) {
  return await this.findOne({
    type: 'private',
    $and: [
      { participants: userId },
      { participants: { $size: 1 } },
    ],
  });
};

conversationSchema.statics.createOrGetPrivate = async function(user1Id, user2Id) {
  let conversation = await this.findPrivateConversation(user1Id, user2Id);
  if (!conversation) {
    conversation = await this.create({
      type: 'private',
      participants: [user1Id, user2Id]
    });
  }
  return conversation;
};

conversationSchema.statics.createOrGetPersonal = async function(userId) {
  let conversation = await this.findPersonalConversation(userId);
  if (!conversation) {
    conversation = await this.create({
      name: 'Cá nhân',
      type: 'private',
      participants: [userId],
    });
  } else if (!conversation.name) {
    conversation.name = 'Cá nhân';
    await conversation.save();
  }
  return conversation;
};

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
