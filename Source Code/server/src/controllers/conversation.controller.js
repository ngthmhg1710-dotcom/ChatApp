import mongoose from 'mongoose';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import { emitToUser } from '../sockets/index.js';

const MAX_MEMBERS         = 300;
const COMMUNITY_THRESHOLD = 300;

async function getUserName(userId) {
  try {
    const user = await mongoose.model('User').findById(userId).select('username');
    return user?.username || null;
  } catch (error) {
    console.error('Get user name error:', error);
    return null;
  }
}

function isGroupConversation(conversation) {
  if (!conversation) return false;
  if (conversation.isGroup === true) return true;
  return conversation.type === 'group' || conversation.type === 'community';
}

function getHistoryCutoffForUser(conversation, userId) {
  if (!isGroupConversation(conversation)) return null;

  const meta = (conversation.formerParticipantMeta || []).find(
    (entry) => (entry?.user?._id || entry?.user)?.toString() === userId?.toString()
  );

  return (
    meta?.historyVisibleUntil ||
    meta?.leftAt ||
    conversation?.historyVisibleUntil ||
    conversation?.dissolvedAt ||
    null
  );
}

async function sanitizeConversationForUser(conversation, userId) {
  if (!conversation) return conversation;

  const convObj = typeof conversation.toObject === 'function'
    ? conversation.toObject()
    : { ...conversation };

  const cutoff = getHistoryCutoffForUser(convObj, userId);
  if (!cutoff) return convObj;

  convObj.historyVisibleUntil = cutoff;

  const lastMessageCreatedAt = convObj.lastMessage?.createdAt
    ? new Date(convObj.lastMessage.createdAt)
    : null;

  if (lastMessageCreatedAt && lastMessageCreatedAt <= new Date(cutoff)) {
    return convObj;
  }

  const visibleLastMessage = await Message.findOne({
    conversation: convObj._id,
    createdAt: { $lte: cutoff },
    deletedFor: { $ne: userId },
  })
    .populate('sender', 'username avatar')
    .sort({ createdAt: -1 })
    .lean();

  convObj.lastMessage = visibleLastMessage || null;
  convObj.updatedAt = visibleLastMessage?.createdAt || cutoff;

  return convObj;
}

// @desc    Create or get private conversation
// @route   POST /api/conversations
export const createConversation = async (req, res) => {
  try {
    const { participantId } = req.body;
    const currentUserId = req.user.id;
    if (!participantId)
      return res.status(400).json({ success: false, message: 'Participant ID is required' });
    const normalizedParticipantId = participantId.toString();
    const conversation = normalizedParticipantId === currentUserId.toString()
      ? await Conversation.createOrGetPersonal(currentUserId)
      : await Conversation.createOrGetPrivate(currentUserId, normalizedParticipantId);
    await conversation.populate('participants', 'username email avatar isOnline lastSeen');
    await conversation.populate('lastMessage');
    
    // Emit socket cho cả 2 người dùng
    const conversationData = conversation.toObject();
    conversation.participants.forEach(participant => {
      emitToUser(participant._id.toString(), 'conversation_created', {
        conversation: conversationData,
        type: 'new_conversation'
      });
    });
    
    res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Create or get private conversation
// @route   POST /api/conversations
export const createGroupConversation = async (req, res) => {
  try {
    const { name, participantIds } = req.body;
    const currentUserId = req.user.id;

    if (!name || !participantIds || participantIds.length < 2)
      return res.status(400).json({ success: false, message: 'Group name and at least 2 participants are required' });

    const allParticipants = [...new Set([currentUserId, ...participantIds])];

    if (allParticipants.length > MAX_MEMBERS)
      return res.status(400).json({ success: false, message: `Nhóm tối đa ${MAX_MEMBERS} thành viên` });

    const groupType = allParticipants.length >= COMMUNITY_THRESHOLD ? 'community' : 'group';

    const conversation = await Conversation.create({
      name,
      type: groupType,
      isGroup: true,
      participants: allParticipants,
      admin: currentUserId,
    });

    // Populate đầy đủ dữ liệu trước khi emit
    await conversation.populate('participants', 'username email avatar isOnline lastSeen');
    await conversation.populate('admin', 'username email avatar');

    await Message.create({
      conversation: conversation._id,
      sender: currentUserId,
      type: 'system',
      content: `${req.user.username} đã tạo nhóm "${name}"`,
    });

    // Chuyển conversation thành object để emit
    const conversationData = conversation.toObject();
    
    // Notify all participants (kể cả người tạo) để cập nhật realtime
    allParticipants.forEach(participantId => {
      emitToUser(participantId.toString(), 'group_created', { 
        conversation: conversationData,
        type: 'new_group',
        createdBy: currentUserId
      });
    });

    res.status(201).json({ success: true, data: conversationData });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all conversations for user
// @route   GET /api/conversations
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      $or: [
        { participants: req.user.id, isActive: true },
        { formerParticipants: req.user.id }
      ]
    })
      .populate('participants', 'username email avatar isOnline lastSeen')
      .populate('admin', 'username email avatar')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username avatar' },
      })
      .sort({ updatedAt: -1 });

    // Đếm unread cho từng conversation
    const userId = req.user.id;
    const conversationIds = conversations.map(c => c._id);
    const unreadAgg = await Message.aggregate([
      {
        $match: {
          conversation: { $in: conversationIds },
          sender: { $ne: new mongoose.Types.ObjectId(userId) },
          readBy: { $ne: new mongoose.Types.ObjectId(userId) },
          deletedFor: { $ne: new mongoose.Types.ObjectId(userId) },
        }
      },
      {
        $group: {
          _id: '$conversation',
          count: { $sum: 1 }
        }
      }
    ]);

    const unreadMap = {};
    unreadAgg.forEach(({ _id, count }) => {
      unreadMap[_id.toString()] = count;
    });

    const result = await Promise.all(
      conversations.map(async (conv) => {
        const sanitized = await sanitizeConversationForUser(conv, userId);
        sanitized.unreadCount = unreadMap[conv._id.toString()] || 0;
        return sanitized;
      })
    );

    result.sort(
      (a, b) => new Date(b.updatedAt || b.historyVisibleUntil || 0) - new Date(a.updatedAt || a.historyVisibleUntil || 0)
    );

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get conversation by ID
// @route   GET /api/conversations/:id
export const getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'username email avatar isOnline lastSeen')
      .populate('admin', 'username email avatar');

    if (!conversation)
      return res.status(404).json({ success: false, message: 'Conversation not found' });

    const userId = req.user.id;
    const isParticipant = conversation.participants.some(p => p._id.toString() === userId);
    const isFormer = (conversation.formerParticipants || []).some(p => p.toString() === userId);

    if (!isParticipant && !isFormer)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const sanitized = await sanitizeConversationForUser(conversation, userId);
    res.status(200).json({ success: true, data: sanitized });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update group name/avatar
// @route   PUT /api/conversations/:id
export const updateGroup = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });
    if (conversation.admin.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Only admin can update group' });

    const oldName = conversation.name;
    if (name) conversation.name   = name.trim();
    if (avatar) conversation.avatar = avatar;
    await conversation.save();

    await conversation.populate('participants', 'username email avatar isOnline');
    await conversation.populate('admin', 'username email avatar');

    if (name && name.trim() !== oldName) {
      await Message.create({
        conversation: conversation._id,
        sender: req.user.id,
        type: 'system',
        content: `${req.user.username} đã đổi tên nhóm thành "${name.trim()}"`,
      });
    }

    conversation.participants.forEach(p => {
      emitToUser(p._id.toString(), 'group_updated', { conversation });
    });

    res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Add participant to group
// @route   POST /api/conversations/:id/participants
// @desc    Add participant to group
// @route   POST /api/conversations/:id/participants
export const addParticipant = async (req, res) => {
  try {
    const { userId } = req.body;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });
    if (conversation.admin.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Only admin can add participants' });
    if (conversation.participants.length >= MAX_MEMBERS)
      return res.status(400).json({ success: false, message: `Nhóm đã đủ ${MAX_MEMBERS} thành viên` });

    if (!conversation.participants.map(p => p.toString()).includes(userId)) {
      // ✅ Lấy thông tin user trước khi thêm
      const userToAdd = await mongoose.model('User').findById(userId).select('username email avatar');
      if (!userToAdd) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      conversation.participants.push(userId);

      // Xóa khỏi formerParticipants nếu được thêm lại
      conversation.formerParticipants = (conversation.formerParticipants || []).filter(
        p => p.toString() !== userId.toString()
      );
      conversation.formerParticipantMeta = (conversation.formerParticipantMeta || []).filter(
        m => (m.user?._id || m.user)?.toString() !== userId.toString()
      );

      if (conversation.participants.length >= COMMUNITY_THRESHOLD && conversation.type === 'group') {
        conversation.type = 'community';
      }

      await conversation.save();

      await Message.create({
        conversation: conversation._id,
        sender: req.user.id,
        type: 'system',
        content: `${req.user.username} đã thêm ${userToAdd.username} vào nhóm`,
      });

      await conversation.populate('participants', 'username email avatar isOnline lastSeen');
      await conversation.populate('admin', 'username email avatar');
      
      const conversationData = conversation.toObject();

      // ✅ Emit cho người được thêm - gửi kèm thông tin user
      emitToUser(userId, 'added_to_group', { 
        conversation: conversationData,
        type: 'member_added',
        addedBy: {
          _id: req.user.id,
          username: req.user.username
        }
      });

      // ✅ Emit cho tất cả thành viên hiện tại - gửi kèm thông tin user
      conversation.participants.forEach(p => {
        emitToUser(p._id.toString(), 'member_added', { 
          conversation: conversationData,
          addedUser: {
            _id: userToAdd._id,
            username: userToAdd.username,
            email: userToAdd.email,
            avatar: userToAdd.avatar
          },
          addedBy: {
            _id: req.user.id,
            username: req.user.username
          },
          type: 'member_added'
        });
      });
    }

    res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Remove participant from group (kick)
// @route   DELETE /api/conversations/:id/participants/:userId
export const removeParticipant = async (req, res) => {
  try {
    const { userId } = req.params;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });
    if (conversation.admin.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Only admin can remove participants' });
    if (userId === req.user.id)
      return res.status(400).json({ success: false, message: 'Admin không thể tự xóa mình' });

    const kickedAt = new Date();
    // ✅ Lấy thông tin user bị kick trước khi xóa
    const kickedUser = await mongoose.model('User').findById(userId).select('username email avatar');
    const kickedUserName = kickedUser?.username || 'một thành viên';

    conversation.participants = conversation.participants.filter(p => p.toString() !== userId);

    if (!(conversation.formerParticipants || []).some(p => p.toString() === userId)) {
      if (!conversation.formerParticipants) conversation.formerParticipants = [];
      conversation.formerParticipants.push(userId);
    }

    if (!conversation.formerParticipantMeta) conversation.formerParticipantMeta = [];
    const existingMetaIdx = conversation.formerParticipantMeta.findIndex(
      m => (m.user?._id || m.user)?.toString() === userId.toString()
    );
    if (existingMetaIdx >= 0) {
      conversation.formerParticipantMeta[existingMetaIdx].leftAt = kickedAt;
      conversation.formerParticipantMeta[existingMetaIdx].historyVisibleUntil = kickedAt;
    } else {
      conversation.formerParticipantMeta.push({
        user: userId,
        leftAt: kickedAt,
        historyVisibleUntil: kickedAt,
      });
    }

    await conversation.save();

    await Message.create({
      conversation: conversation._id,
      sender: req.user.id,
      type: 'system',
      content: `${req.user.username} đã xóa ${kickedUserName} khỏi nhóm`,
    });

    await conversation.populate('participants', 'username email avatar isOnline lastSeen');
    await conversation.populate('admin', 'username email avatar');
    
    const conversationData = conversation.toObject();

    // Notify người bị kick - gửi kèm thông tin
    const convForKicked = conversation.toObject();
    const kickedMeta = (convForKicked.formerParticipantMeta || []).find(
      m => (m.user?._id || m.user)?.toString() === userId.toString()
    );
    convForKicked.historyVisibleUntil = kickedMeta?.historyVisibleUntil || kickedAt;

    emitToUser(userId, 'removed_from_group', { 
      conversation: convForKicked,
      removedBy: {
        _id: req.user.id,
        username: req.user.username
      },
      type: 'member_removed'
    });

    // Notify remaining members - gửi kèm thông tin user bị xóa
    conversation.participants.forEach(p => {
      emitToUser(p._id.toString(), 'member_removed', { 
        conversation: conversationData,
        removedUser: kickedUser ? {
          _id: kickedUser._id,
          username: kickedUser.username,
          email: kickedUser.email,
          avatar: kickedUser.avatar
        } : { _id: userId, username: kickedUserName },
        removedBy: {
          _id: req.user.id,
          username: req.user.username
        },
        type: 'member_removed'
      });
    });

    res.status(200).json({ success: true, message: 'Participant removed successfully' });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Leave group
// @route   POST /api/conversations/:id/leave
export const leaveGroup = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });

    const isAdmin = conversation.admin.toString() === req.user.id;

    // ── FIX: ghi lại thời điểm rời nhóm ──────────────────────────────────────
    const leftAt = new Date();

    conversation.participants = conversation.participants.filter(p => p.toString() !== req.user.id);

    if (!(conversation.formerParticipants || []).some(p => p.toString() === req.user.id)) {
      if (!conversation.formerParticipants) conversation.formerParticipants = [];
      conversation.formerParticipants.push(req.user.id);
    }

    if (!conversation.formerParticipantMeta) conversation.formerParticipantMeta = [];
    const existingMetaIdx = conversation.formerParticipantMeta.findIndex(
      m => (m.user?._id || m.user)?.toString() === req.user.id.toString()
    );
    if (existingMetaIdx >= 0) {
      conversation.formerParticipantMeta[existingMetaIdx].leftAt = leftAt;
      conversation.formerParticipantMeta[existingMetaIdx].historyVisibleUntil = leftAt;
    } else {
      conversation.formerParticipantMeta.push({
        user: req.user.id,
        leftAt: leftAt,
        historyVisibleUntil: leftAt,  // <-- user chỉ xem đến thời điểm này
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // If admin leaves, transfer to next member
    if (isAdmin && conversation.participants.length > 0) {
      conversation.admin = conversation.participants[0];
      emitToUser(conversation.participants[0].toString(), 'promoted_to_admin', {
        conversationId: conversation._id,
        message: 'Bạn đã trở thành trưởng nhóm mới',
      });
    }

    if (conversation.participants.length === 0) {
      conversation.isActive = false;
    }

    await conversation.save();

    await Message.create({
      conversation: conversation._id,
      sender: req.user.id,
      type: 'system',
      content: `${req.user.username} đã rời nhóm`,
    });

    await conversation.populate('participants', 'username email avatar isOnline');
    await conversation.populate('admin', 'username email avatar');

    // Notify remaining members
    conversation.participants.forEach(p => {
      emitToUser(p.toString(), 'member_left', {
        conversationId: conversation._id,
        userId: req.user.id,
        username: req.user.username,
        conversation,
      });
    });

    res.status(200).json({ success: true, message: 'Left group successfully' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete/dissolve group (Admin only)
// @route   DELETE /api/conversations/:id
export const deleteGroup = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.isGroup)
      return res.status(404).json({ success: false, message: 'Group not found' });
    if (conversation.admin.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Only admin can dissolve group' });

    // ── FIX: ghi dissolvedAt và historyVisibleUntil ───────────────────────────
    const dissolvedAt = new Date();
    conversation.dissolvedAt = dissolvedAt;
    conversation.dissolvedBy = req.user.id;
    conversation.historyVisibleUntil = dissolvedAt;  // cutoff chung cho mọi member
    conversation.isActive = false;
    await conversation.save();
    // ─────────────────────────────────────────────────────────────────────────

    const memberIds = [...conversation.participants.map(p => p.toString())];

    // Lấy conversation object có historyVisibleUntil để gửi cho clients
    const convObj = conversation.toObject();

    memberIds.forEach(id => {
      emitToUser(id, 'group_dissolved', {
        conversationId: conversation._id,
        groupName: conversation.name,
        conversation: convObj,
      });
    });

    res.status(200).json({ success: true, message: 'Group dissolved successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
// @desc    Transfer group leadership to another member
// @route   POST /api/conversations/:id/transfer-leadership
export const transferLeadership = async (req, res) => {
  try {
    const { id } = req.params;
    const { newLeaderId } = req.body;
    const userId = req.user.id;

    // Tìm conversation
    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm' });
    }

    // Kiểm tra người dùng hiện tại có phải admin không
    if (conversation.admin.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Chỉ trưởng nhóm mới có thể chuyển quyền' });
    }

    // Kiểm tra người nhận có trong nhóm không
    const isNewLeaderInGroup = conversation.participants.some(
      p => p.toString() === newLeaderId.toString()
    );
    if (!isNewLeaderInGroup) {
      return res.status(404).json({ success: false, message: 'Người dùng không phải thành viên của nhóm' });
    }

    // Kiểm tra không chuyển cho chính mình
    if (newLeaderId.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: 'Không thể chuyển quyền cho chính mình' });
    }

    // Lưu tên người nhận để thông báo
    const newLeader = await mongoose.model('User').findById(newLeaderId).select('username');
    const oldLeader = req.user;

    // Cập nhật admin mới
    conversation.admin = newLeaderId;
    await conversation.save();

    // Tạo message hệ thống
    await Message.create({
      conversation: conversation._id,
      sender: userId,
      type: 'system',
      content: `${oldLeader.username} đã chuyển quyền trưởng nhóm cho ${newLeader?.username || 'thành viên khác'}`,
    });

    // Populate dữ liệu để trả về
    await conversation.populate('participants', 'username email avatar isOnline lastSeen');
    await conversation.populate('admin', 'username email avatar');
    await conversation.populate('lastMessage');

    // Chỉ emit socket cho các thành viên còn lại (không gửi cho người vừa rời)
    conversation.participants.forEach(participant => {
      // Không gửi cho người vừa chuyển quyền (họ sẽ rời nhóm ngay sau)
      if (participant._id.toString() !== userId.toString()) {
        emitToUser(participant._id.toString(), 'promoted_to_admin', {
          conversation,
          message: `${oldLeader.username} đã chuyển quyền trưởng nhóm cho ${newLeader?.username || 'thành viên khác'}`,
        });
      }
    });

    res.status(200).json({
      success: true,
      data: conversation,
      message: `Đã chuyển quyền trưởng nhóm cho ${newLeader?.username || 'thành viên khác'}`
    });
  } catch (error) {
    console.error('Transfer leadership error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};