import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';

const PIN_LIMIT = 3;

function isGroupConversation(conversation) {
  if (!conversation) return false;
  if (conversation.isGroup === true) return true;
  return conversation.type === 'group' || conversation.type === 'community';
}

function isActiveParticipant(conversation, userId) {
  const uid = userId?.toString();
  return (conversation?.participants || []).some((id) => id.toString() === uid);
}

function canInteractWithConversation(conversation, userId) {
  if (!isActiveParticipant(conversation, userId)) return false;
  if (isGroupConversation(conversation) && conversation?.dissolvedAt) return false;
  return true;
}

export const setupMessageHandlers = (io, socket) => {
  socket.on('join_conversation', async ({ conversationId }) => {
    try {
      const conversation = await Conversation.findById(conversationId)
        .select('participants dissolvedAt isGroup type');

      if (!conversation) return;
      if (!canInteractWithConversation(conversation, socket.userId)) return;

      socket.join(`conversation:${conversationId}`);
    } catch (error) {
      console.error('join_conversation error:', error);
    }
  });

  socket.on('leave_conversation', ({ conversationId }) => {
    socket.leave(`conversation:${conversationId}`);
  });

  // ── Gửi tin nhắn ─────────────────────────────────────────────────────────
  socket.on('send_message', async (data) => {
    try {
      const {
        conversationId,
        content,
        type = 'text',
        fileUrl,
        fileName,
        fileSize,
        metadata,
        replyTo,
      } = data;

      const conversation = await Conversation.findById(conversationId)
        .select('participants formerParticipants dissolvedAt isGroup type');

      if (!conversation) {
        return socket.emit('message_error', { error: 'Conversation not found' });
      }

      if (!isActiveParticipant(conversation, socket.userId)) {
        return socket.emit('message_error', { error: 'Báº¡n khÃ´ng thuá»™c cuá»™c trÃ² chuyá»‡n nÃ y' });
      }

      const isParticipant = conversation.participants.some(
        (id) => id.toString() === socket.userId.toString()
      );

      if (!isParticipant) {
        return socket.emit('message_error', { error: 'Bạn không thuộc cuộc trò chuyện này' });
      }

      if (isGroupConversation(conversation) && conversation.dissolvedAt) {
        return socket.emit('message_error', { error: 'Nhóm đã giải tán, bạn chỉ có thể xem lịch sử chat' });
      }

      const message = await Message.create({
        conversation: conversationId,
        sender: socket.userId,
        content: content || '',
        type,
        fileUrl,
        fileName,
        fileSize,
        metadata: metadata || {},
        replyTo: replyTo || null,
        readBy: [socket.userId],
        reactions: {},
        editHistory: [],
      });

      await message.populate('sender', 'username avatar email');
      if (replyTo) {
        await message.populate('replyTo', 'content sender type');
      }

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        updatedAt: new Date(),
      });

      const payload = {
        message,
        conversationId,
      };

      // 1. Emit vào room để người đang mở cuộc trò chuyện thấy ngay
      io.to(`conversation:${conversationId}`).emit('new_message', payload);

      // 2. Emit thêm vào personal room của từng participant để sidebar/unread cập nhật realtime
      conversation.participants.forEach((participantId) => {
        io.to(`user:${participantId.toString()}`).emit('new_message', payload);
      });
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // ── Đọc tin nhắn ─────────────────────────────────────────────────────────
  socket.on('message_read', async ({ messageId, conversationId }) => {
    try {
      const conversation = await Conversation.findById(conversationId).select('participants');

      if (!conversation) return;

      const isParticipant = conversation.participants.some(
        (id) => id.toString() === socket.userId.toString()
      );

      if (!isParticipant) return;

      await Message.updateMany(
        {
          conversation: conversationId,
          sender: { $ne: socket.userId },
          readBy: { $ne: socket.userId },
        },
        { $addToSet: { readBy: socket.userId } }
      );

      const payload = {
        conversationId,
        messageId,
        readBy: socket.userId,
      };

      socket.to(`conversation:${conversationId}`).emit('messages_read', payload);

      // Đồng bộ cả các tab/client khác của chính user đang đọc
      io.to(`user:${socket.userId}`).emit('messages_read', payload);
    } catch (error) {
      console.error('Mark read error:', error);
    }
  });

  // ── Typing ────────────────────────────────────────────────────────────────
  socket.on('typing_start', async ({ conversationId }) => {
    try {
      const conversation = await Conversation.findById(conversationId)
        .select('participants dissolvedAt isGroup type');

      if (!canInteractWithConversation(conversation, socket.userId)) return;

      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        conversationId,
        username: socket.user?.username,
      });
    } catch (error) {
      console.error('typing_start error:', error);
    }
  });

  socket.on('typing_stop', async ({ conversationId }) => {
    try {
      const conversation = await Conversation.findById(conversationId)
        .select('participants dissolvedAt isGroup type');

      if (!canInteractWithConversation(conversation, socket.userId)) return;

      socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
        userId: socket.userId,
        conversationId,
      });
    } catch (error) {
      console.error('typing_stop error:', error);
    }
  });

  // ── Reaction ──────────────────────────────────────────────────────────────
  socket.on('react_message', async ({ messageId, emoji, conversationId }) => {
    try {
      const conversation = await Conversation.findById(conversationId)
        .select('participants dissolvedAt isGroup type');
      const message = await Message.findById(messageId);
      if (!message || !conversation) return;

      if (!canInteractWithConversation(conversation, socket.userId)) {
        return socket.emit('message_error', { error: 'Cuá»™c trÃ² chuyá»‡n nÃ y hiá»‡n chá»‰ cÃ²n xem lá»‹ch sá»­' });
      }

      if (!message.reactions) message.reactions = new Map();
      const users = message.reactions.get(emoji) || [];
      const idx = users.findIndex((id) => id.toString() === socket.userId);

      if (idx > -1) users.splice(idx, 1);
      else users.push(socket.userId);

      message.reactions.set(emoji, users);
      message.markModified('reactions');
      await message.save();

      const reactionsObj = {};
      message.reactions.forEach((v, k) => {
        reactionsObj[k] = v;
      });

      io.to(`conversation:${conversationId}`).emit('message_reaction', {
        messageId,
        reactions: reactionsObj,
        conversationId,
      });
    } catch (error) {
      console.error('react_message error:', error);
    }
  });

  // ── Chỉnh sửa tin nhắn ───────────────────────────────────────────────────
  socket.on('edit_message', async ({ messageId, content, conversationId }) => {
    try {
      const conversation = await Conversation.findById(conversationId)
        .select('participants dissolvedAt isGroup type');
      const message = await Message.findById(messageId);
      if (!message || !conversation) return;

      if (!canInteractWithConversation(conversation, socket.userId)) {
        return socket.emit('message_error', { error: 'Cuá»™c trÃ² chuyá»‡n nÃ y hiá»‡n chá»‰ cÃ²n xem lá»‹ch sá»­' });
      }

      if (message.sender.toString() !== socket.userId) {
        return socket.emit('message_error', { error: 'Không có quyền chỉnh sửa' });
      }

      if (message.type !== 'text') {
        return socket.emit('message_error', { error: 'Chỉ có thể sửa tin nhắn văn bản' });
      }

      if (!message.editHistory) message.editHistory = [];
      message.editHistory.push({ content: message.content, editedAt: new Date() });
      message.content = content;
      message.isEdited = true;
      await message.save();

      io.to(`conversation:${conversationId}`).emit('message_edited', {
        messageId,
        content,
        editHistory: message.editHistory,
        isEdited: true,
        conversationId,
      });
    } catch (error) {
      console.error('edit_message error:', error);
    }
  });

  // ── Xóa tin nhắn ─────────────────────────────────────────────────────────
  socket.on('delete_message', async ({ messageId, conversationId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      const conversation = await Conversation.findById(conversationId)
        .select('participants dissolvedAt isGroup type admin');
      if (!conversation) return;

      if (!canInteractWithConversation(conversation, socket.userId)) {
        return socket.emit('message_error', { error: 'Cuá»™c trÃ² chuyá»‡n nÃ y hiá»‡n chá»‰ cÃ²n xem lá»‹ch sá»­' });
      }
      const isAdmin = conversation?.admin?.toString() === socket.userId;
      const isSender = message.sender.toString() === socket.userId;

      if (!isSender && !isAdmin) {
        return socket.emit('message_error', { error: 'Không có quyền xóa' });
      }

      await Message.findByIdAndDelete(messageId);
      await Conversation.findByIdAndUpdate(conversationId, {
        $pull: { pinnedMessages: { _id: messageId } },
      });

      io.to(`conversation:${conversationId}`).emit('message_deleted', {
        messageId,
        conversationId,
      });
    } catch (error) {
      console.error('delete_message error:', error);
    }
  });

  // ── Ghim / bỏ ghim ────────────────────────────────────────────────────────
  socket.on('pin_message', async ({ messageId, conversationId, isPinning }) => {
    try {
      const conversation = await Conversation.findById(conversationId)
        .select('participants dissolvedAt isGroup type pinnedMessages');
      if (!conversation) return;

      if (!canInteractWithConversation(conversation, socket.userId)) {
        return socket.emit('message_error', { error: 'Cuá»™c trÃ² chuyá»‡n nÃ y hiá»‡n chá»‰ cÃ²n xem lá»‹ch sá»­' });
      }

      if (!Array.isArray(conversation.pinnedMessages)) {
        conversation.pinnedMessages = [];
      }

      let updatedPins;

      if (isPinning) {
        const alreadyPinned = conversation.pinnedMessages.some(
          (p) => p._id?.toString() === messageId?.toString()
        );

        if (alreadyPinned) {
          updatedPins = conversation.pinnedMessages;
        } else {
          const message = await Message.findById(messageId).populate('sender', 'username avatar');
          if (!message) return;

          const pinEntry = {
            _id: message._id,
            content: message.content,
            type: message.type,
            fileName: message.fileName,
            fileUrl: message.fileUrl,
            sender: {
              _id: message.sender._id,
              username: message.sender.username,
              avatar: message.sender.avatar,
            },
            pinnedAt: new Date(),
            pinnedBy: socket.userId,
          };

          if (conversation.pinnedMessages.length >= PIN_LIMIT) {
            conversation.pinnedMessages.shift();
          }

          conversation.pinnedMessages.push(pinEntry);
          await conversation.save();
          updatedPins = conversation.pinnedMessages;
        }
      } else {
        conversation.pinnedMessages = conversation.pinnedMessages.filter(
          (p) => p._id?.toString() !== messageId?.toString()
        );
        await conversation.save();
        updatedPins = conversation.pinnedMessages;
      }

      io.to(`conversation:${conversationId}`).emit('pin_updated', {
        conversationId,
        isPinning,
        pinnedMessages: updatedPins,
        pinnedBy: socket.user?.username || 'Ai đó',
        messageId,
      });
    } catch (error) {
      console.error('pin_message error:', error);
      socket.emit('message_error', { error: 'Không thể ghim tin nhắn' });
    }
  });

  // ── Group socket events (relay) ───────────────────────────────────────────
  socket.on('group_dissolved', ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit('group_dissolved', { conversationId });
  });

  socket.on('member_removed', ({ conversationId, userId }) => {
    socket.to(`conversation:${conversationId}`).emit('member_removed', {
      conversationId,
      userId,
    });
  });
};
