import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';

function isGroupConversation(c) {
  if (!c) return false;
  if (c.isGroup === true) return true;
  return c.type === 'group' || c.type === 'community';
}

function hasConversationAccess(conversation, userId) {
  const uid = userId?.toString();
  return (conversation?.participants || []).some((p) => p.toString() === uid) ||
    (conversation?.formerParticipants || []).some((p) => p.toString() === uid);
}

function isActiveParticipant(conversation, userId) {
  const uid = userId?.toString();
  return (conversation?.participants || []).some((p) => p.toString() === uid);
}

function getHistoryCutoffForUser(conversation, userId) {
  if (!isGroupConversation(conversation)) return null;
  const uid = userId?.toString();
  const record = (conversation?.formerParticipantMeta || []).find(
    (entry) => (entry?.user?._id || entry?.user)?.toString() === uid
  );
  if (record?.leftAt) return record.leftAt;
  if (conversation?.dissolvedAt) return conversation.dissolvedAt;
  if (isActiveParticipant(conversation, userId)) return null;
  return null;
}

// @desc    Get messages for a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is part of conversation
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (!hasConversationAccess(conversation, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this conversation'
      });
    }

    const cutoff = getHistoryCutoffForUser(conversation, req.user.id);
    const messageQuery = {
      conversation: conversationId,
      deletedFor: { $ne: req.user.id },
    };
    if (cutoff) {
      messageQuery.createdAt = { $lte: cutoff };
    }

    // Get messages with pagination
    const messages = await Message.find(messageQuery)
    .populate('sender', 'username avatar email')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const count = await Message.countDocuments(messageQuery);

    res.status(200).json({
      success: true,
      data: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Search messages by content (scoped: all | dm | group)
// @route   GET /api/messages/search?q=&scope=
export const searchMessages = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const scope = req.query.scope || 'all';
    if (!q) {
      return res.status(200).json({ success: true, data: [] });
    }

    const userId = req.user.id;
    const convs = await Conversation.find({
      $and: [
        {
          $or: [
            { participants: userId },
            { formerParticipants: userId },
          ],
        },
        {
          $or: [
            { isActive: true },
            { isGroup: true },
            { type: { $in: ['group', 'community'] } },
          ],
        },
      ],
    })
      .populate('participants', 'username email avatar')
      .populate('admin', 'username email avatar');

    const filteredConvDocs = convs.filter((c) => {
      if (scope === 'dm') return !isGroupConversation(c);
      if (scope === 'group') return isGroupConversation(c);
      return true;
    });

    const messageScopes = filteredConvDocs.map((c) => {
      const cutoff = getHistoryCutoffForUser(c, userId);
      return cutoff
        ? { conversation: c._id, createdAt: { $lte: cutoff } }
        : { conversation: c._id };
    });

    if (messageScopes.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const hits = await Message.find({
      $and: [
        { $or: messageScopes },
        {
          $or: [
            { content: { $regex: regex } },
            { fileName: { $regex: regex } },
          ],
        },
        { deletedFor: { $ne: userId } },
      ],
    })
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(120)
      .lean();

    const seen = new Set();
    const out = [];
    for (const m of hits) {
      const cid = m.conversation.toString();
      if (seen.has(cid)) continue;
      seen.add(cid);
      const conv = filteredConvDocs.find((c) => c._id.toString() === cid);
      if (!conv) continue;
      const preview =
        (m.content && m.content.slice(0, 120)) ||
        (m.fileName && `📎 ${m.fileName}`) ||
        'Tin nhắn';
      out.push({
        conversation: conv,
        message: m,
        preview,
      });
      if (out.length >= 30) break;
    }

    res.status(200).json({ success: true, data: out });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Upload file for message
// @route   POST /api/messages/upload
// @access  Private
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 
                     req.file.mimetype.startsWith('video/') ? 'video' : 'file';

    res.status(200).json({
      success: true,
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/:conversationId/read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        readBy: { $ne: userId },
      },
      { $addToSet: { readBy: userId } }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Mark messages read error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
