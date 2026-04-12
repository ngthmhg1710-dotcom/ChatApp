import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';
import User from '../models/user.model.js';

const activeCalls = new Map();

// Grace-period timers: key = `${callId}:${userId}` → timerId
const disconnectTimers = new Map();

const DISCONNECT_GRACE_MS = 15_000; // 15 giây

// ─── helpers ─────────────────────────────────────────────────────────────────

const cancelDisconnectTimer = (callId, userId) => {
  const key = `${callId}:${userId}`;
  const timer = disconnectTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(key);
  }
};

const normalizeId = (value) => String(value || '');

const getCallAudience = (call) => {
  if (!call) return [];
  const audience = new Set();
  (call.conversationMembers || []).forEach((memberId) => {
    const normalized = normalizeId(memberId);
    if (normalized) audience.add(normalized);
  });
  (call.participants || new Set()).forEach((memberId) => {
    const normalized = normalizeId(memberId);
    if (normalized) audience.add(normalized);
  });
  (call.pending || new Set()).forEach((memberId) => {
    const normalized = normalizeId(memberId);
    if (normalized) audience.add(normalized);
  });
  return Array.from(audience);
};

const serializeCall = (callId, call, userId = null, extra = {}) => ({
  callId,
  conversationId: call.conversationId,
  callType: call.callType,
  callerId: call.callerId,
  callerName: call.callerName,
  participants: Array.from(call.participants || []).map(String),
  pending: Array.from(call.pending || []).map(String),
  startedAt: call.startedAt,
  createdAt: call.createdAt,
  isGroup: !!call.isGroup,
  wasParticipant: userId ? call.participants.has(userId) : false,
  isCurrentUserInCall: userId ? call.participants.has(userId) : false,
  canJoin: !!call.startedAt,
  ...extra,
});

const findActiveCallForUser = (userId, { excludeCallId = null, startedOnly = true } = {}) => {
  const normalizedUserId = normalizeId(userId);
  const excluded = normalizeId(excludeCallId);
  if (!normalizedUserId) return null;

  for (const [callId, call] of activeCalls.entries()) {
    if (excluded && normalizeId(callId) === excluded) continue;
    if (startedOnly && !call.startedAt) continue;
    if (call.participants.has(normalizedUserId)) {
      return { callId, call };
    }
  }
  return null;
};

// ─── main export ─────────────────────────────────────────────────────────────

export const setupCallHandlers = (io, socket) => {

  // ── broadcast trạng thái call cho toàn conversation ──────────────────────
  const broadcastCallState = (callId) => {
    const call = activeCalls.get(callId);
    if (!call || !call.startedAt) return;
    io.to(`conversation:${call.conversationId}`).emit('active_call_update', {
      callId,
      conversationId: call.conversationId,
      callType: call.callType,
      callerId: call.callerId,
      callerName: call.callerName,
      participants: Array.from(call.participants),
      startedAt: call.startedAt,
      isGroup: call.isGroup,
    });
  };

  // ── thực sự xóa user sau grace period ────────────────────────────────────
  const removeUserFromCall = (callId, userId) => {
    const call = activeCalls.get(callId);
    if (!call) return;

    call.participants.delete(userId);
    call.pending.delete(userId);

    // Thông báo cho những người còn lại
    for (const pid of call.participants) {
      io.to(`user:${pid}`).emit('peer_left_call', {
        from: userId,
        callId,
        conversationId: call.conversationId,
        remainingCount: call.participants.size,
        reason: 'timeout',
      });
    }

    if (call.participants.size === 0) {
      // Không còn ai → kết thúc call
      activeCalls.delete(callId);
      io.to(`conversation:${call.conversationId}`).emit('active_call_ended', {
        callId,
        conversationId: call.conversationId,
        reason: 'empty',
      });
    } else {
      broadcastCallState(callId);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK ACTIVE CALL (client gọi sau reload để biết call nào đang chạy)
  // ═══════════════════════════════════════════════════════════════════════════
  socket.on('check_active_call', ({ conversationId }) => {
    for (const [callId, call] of activeCalls.entries()) {
      if (call.conversationId !== conversationId) continue;
      if (!call.startedAt) continue;

      // User có đang trong phòng không?
      const isParticipant = call.participants.has(socket.userId);

      socket.emit('active_call_exists', {
        callId,
        conversationId: call.conversationId,
        callType: call.callType,
        callerId: call.callerId,
        callerName: call.callerName,
        participants: Array.from(call.participants),
        startedAt: call.startedAt,
        isGroup: call.isGroup,
        wasParticipant: isParticipant,
      });
      return;
    }
    // Không có call nào
    socket.emit('no_active_call', { conversationId });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REJOIN (user reload trang trong khi đang call)
  // ═══════════════════════════════════════════════════════════════════════════
  socket.on('rejoin_call', ({ callId, conversationId }) => {
    const call = activeCalls.get(callId);
    if (!call) {
      socket.emit('call_not_found', { callId });
      return;
    }
    if (!call.startedAt) {
      socket.emit('call_not_started', { callId });
      return;
    }

    cancelDisconnectTimer(callId, socket.userId);
    call.participants.add(socket.userId);

    // Thông báo các peers đang trong phòng rằng user này quay lại
    const peers = Array.from(call.participants).filter(id => id !== socket.userId);
    for (const pid of peers) {
      io.to(`user:${pid}`).emit('peer_rejoined', {
        from: socket.userId,
        fromUser: socket.user,
        callId,
        conversationId,
      });
    }

    // Gửi lại danh sách peers để client re-negotiate
    socket.emit('call_peers', {
      callId,
      conversationId,
      peers,
      callType: call.callType,
      startedAt: call.startedAt,
    });

    broadcastCallState(callId);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIATE CALL
  // ═══════════════════════════════════════════════════════════════════════════
  socket.on('call_user', ({
    to, offer, callType, callId, conversationId, isGroup, groupTargets,
  }) => {
    // Tạo entry call nếu chưa có
    if (!activeCalls.has(callId)) {
      activeCalls.set(callId, {
        callId,
        conversationId,
        callType,
        callerId: socket.userId,
        callerName: socket.user?.username,
        participants: new Set([socket.userId]),
        pending: new Set(),
        startedAt: null,  // null cho đến khi có người accept
        createdAt: new Date().toISOString(),
        isGroup: isGroup || false,
      });
    }

    const call = activeCalls.get(callId);

    // Đây là re-offer từ người ĐANG TRONG PHÒNG gửi tới peer mới rejoin
    // (server nhận được khi onNewPeerJoined / onPeerRejoined ở client)
    const isReoffer = call.startedAt !== null && call.participants.has(socket.userId);

    if (isReoffer) {
      // Chỉ forward offer tới target, không thay đổi state call
      io.to(`user:${to}`).emit('incoming_call', {
        from: socket.userId,
        fromUser: socket.user,
        offer,
        callType,
        callId,
        conversationId,
        isGroup: call.isGroup,
        isReoffer: true,   // ← client dùng flag này để tự động answer (không show UI)
        timestamp: new Date(),
      });
      return;
    }

    // Call mới hoặc gửi invite tới nhiều targets (group)
    const targets = isGroup && Array.isArray(groupTargets) ? groupTargets : [to];

    for (const targetId of targets) {
      if (!targetId || String(targetId) === String(socket.userId)) continue;
      call.pending.add(String(targetId));
      io.to(`user:${targetId}`).emit('incoming_call', {
        from: socket.userId,
        fromUser: socket.user,
        offer,
        callType,
        callId,
        conversationId,
        isGroup: isGroup || false,
        isReoffer: false,
        timestamp: new Date(),
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCEPT CALL  (bên nhận bấm chấp nhận)
  // ═══════════════════════════════════════════════════════════════════════════
  socket.on('accept_call', async ({ to, answer, callId, conversationId }) => {
    cancelDisconnectTimer(callId, socket.userId);

    const call = activeCalls.get(callId);
    if (!call) {
      // Call đã bị huỷ trước khi accept
      socket.emit('call_not_found', { callId });
      return;
    }

    const existingParticipants = Array.from(call.participants);
    call.participants.add(socket.userId);
    call.pending.delete(socket.userId);

    if (!call.startedAt) {
      call.startedAt = new Date().toISOString();
    }

    // Thông báo caller (và các peer khác trong group) có người mới join
    for (const pid of existingParticipants) {
      if (pid === socket.userId) continue;
      io.to(`user:${pid}`).emit('new_peer_joined', {
        from: socket.userId,
        fromUser: socket.user,
        callId,
        conversationId,
      });
    }

    // Gửi answer về caller (to = caller's userId)
    try {
      const sockets = await io.in(`user:${to}`).allSockets();
      console.log('accept_call: sending call_accepted to', to, 'sockets:', Array.from(sockets));
    } catch (err) {
      console.warn('accept_call: error listing sockets for user:', to, err && err.message);
    }

    io.to(`user:${to}`).emit('call_accepted', {
      from: socket.userId,
      fromUser: socket.user,
      answer,
      callId,
      timestamp: new Date(),
    });

    // Cập nhật toàn bộ conversation về trạng thái call
    broadcastCallState(callId);

    // Notify all members (để hiện banner)
    try {
      const conv = await Conversation.findById(conversationId).select('participants');
      for (const memberId of (conv?.participants || [])) {
        io.to(`user:${memberId}`).emit('group_call_participant_update', {
          callId,
          conversationId,
          participantId: socket.userId,
          status: 'joined',
        });
      }
    } catch {}
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REJECT CALL
  // ═══════════════════════════════════════════════════════════════════════════
  socket.on('reject_call', async ({ to, reason, callId, conversationId }) => {
    const call = activeCalls.get(callId);
    if (call) {
      call.pending.delete(socket.userId);
    }

    io.to(`user:${to}`).emit('call_rejected', {
      from: socket.userId,
      fromUser: socket.user,
      reason: reason || 'User declined the call',
      callId,
      timestamp: new Date(),
    });

    // Cho 1-1: nếu caller cũng đã reject (cancelled) → xoá call
    if (call && !call.isGroup && call.participants.size <= 1) {
      activeCalls.delete(callId);
      io.to(`conversation:${conversationId}`).emit('active_call_ended', {
        callId,
        conversationId,
        reason: 'rejected',
      });
    }

    try {
      const conv = await Conversation.findById(conversationId).select('participants');
      for (const memberId of (conv?.participants || [])) {
        io.to(`user:${memberId}`).emit('group_call_participant_update', {
          callId,
          conversationId,
          participantId: socket.userId,
          status: 'rejected',
        });
      }
    } catch {}
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAVE CALL  (user chủ động rời, không kết thúc cả phòng với group)
  // ═══════════════════════════════════════════════════════════════════════════
  socket.on('leave_call', ({ callId, conversationId }) => {
    const call = activeCalls.get(callId);
    if (!call) return;

    cancelDisconnectTimer(callId, socket.userId);
    call.participants.delete(socket.userId);
    call.pending.delete(socket.userId);

    for (const pid of call.participants) {
      io.to(`user:${pid}`).emit('peer_left_call', {
        from: socket.userId,
        callId,
        conversationId,
        remainingCount: call.participants.size,
        reason: 'left',
      });
    }

    if (call.participants.size === 0) {
      activeCalls.delete(callId);
      io.to(`conversation:${conversationId}`).emit('active_call_ended', {
        callId,
        conversationId,
        reason: 'empty',
      });
    } else {
      broadcastCallState(callId);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // END CALL  (1-1: kết thúc hẳn; group: nếu là người cuối thì kết thúc)
  // ═══════════════════════════════════════════════════════════════════════════
  socket.on('end_call', ({ to, callId, conversationId }) => {
    const call = activeCalls.get(callId);

    if (call) {
      call.participants.delete(socket.userId);
      call.pending.delete(socket.userId);

      if (!call.isGroup || call.participants.size === 0) {
        // Xóa call
        activeCalls.delete(callId);
        // Dọn grace timers liên quan
        for (const [key] of disconnectTimers.entries()) {
          if (key.startsWith(`${callId}:`)) {
            clearTimeout(disconnectTimers.get(key));
            disconnectTimers.delete(key);
          }
        }
        io.to(`conversation:${conversationId}`).emit('active_call_ended', {
          callId,
          conversationId,
          reason: 'ended',
        });
      } else {
        // Group còn người → chỉ notify người đó rời
        for (const pid of call.participants) {
          io.to(`user:${pid}`).emit('peer_left_call', {
            from: socket.userId,
            callId,
            conversationId,
            remainingCount: call.participants.size,
            reason: 'ended',
          });
        }
        broadcastCallState(callId);
      }
    }

    // Gửi call_ended về phía bên kia (1-1)
    if (to) {
      io.to(`user:${to}`).emit('call_ended', {
        from: socket.userId,
        callId,
        timestamp: new Date(),
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // JOIN EXISTING CALL  (từ banner "Tham gia")
  // ═══════════════════════════════════════════════════════════════════════════
  socket.on('join_existing_call', ({ callId, conversationId }) => {
    const call = activeCalls.get(callId);
    if (!call) {
      socket.emit('call_not_found', { callId });
      return;
    }
    if (!call.startedAt) {
      socket.emit('call_not_started', { callId });
      return;
    }

    cancelDisconnectTimer(callId, socket.userId);
    const wasAlreadyIn = call.participants.has(socket.userId);
    call.participants.add(socket.userId);
    call.pending.delete(socket.userId);

    const peers = Array.from(call.participants).filter(id => id !== socket.userId);

    if (!wasAlreadyIn) {
      for (const pid of peers) {
        io.to(`user:${pid}`).emit('new_peer_joined', {
          from: socket.userId,
          fromUser: socket.user,
          callId,
          conversationId,
        });
      }
    }

    socket.emit('call_join_approved', {
      callId,
      conversationId,
      callType: call.callType,
      peers,
      startedAt: call.startedAt,
    });

    broadcastCallState(callId);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ICE CANDIDATE
  // ═══════════════════════════════════════════════════════════════════════════
  socket.on('ice_candidate', ({ to, candidate }) => {
    if (!to || !candidate) return;
    io.to(`user:${to}`).emit('ice_candidate', {
      from: socket.userId,
      candidate,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIA STATE TOGGLES
  // ═══════════════════════════════════════════════════════════════════════════
  const broadcastToCallPeers = (callId, to, event, payload) => {
    if (callId && activeCalls.has(callId)) {
      const call = activeCalls.get(callId);
      for (const pid of call.participants) {
        if (pid !== socket.userId) {
          io.to(`user:${pid}`).emit(event, payload);
        }
      }
    } else if (to) {
      io.to(`user:${to}`).emit(event, payload);
    }
  };

  socket.on('toggle_video', ({ to, enabled, callId }) => {
    broadcastToCallPeers(callId, to, 'peer_video_toggle', { from: socket.userId, enabled });
  });

  socket.on('toggle_audio', ({ to, enabled, callId }) => {
    broadcastToCallPeers(callId, to, 'peer_audio_toggle', { from: socket.userId, enabled });
  });

  socket.on('toggle_deafen', ({ to, deafened, callId }) => {
    broadcastToCallPeers(callId, to, 'peer_deafen_toggle', { from: socket.userId, deafened });
  });

  socket.on('screen_share_started', ({ to, conversationId, callId }) => {
    broadcastToCallPeers(callId, to, 'peer_screen_share_started', { from: socket.userId, conversationId });
  });

  socket.on('screen_share_stopped', ({ to, conversationId, callId }) => {
    broadcastToCallPeers(callId, to, 'peer_screen_share_stopped', { from: socket.userId, conversationId });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPEAKING STATE  (VAD)
  // ═══════════════════════════════════════════════════════════════════════════
  socket.on('speaking_state', ({ callId, speaking, lastSpokeAt }) => {
    if (!callId) return;
    const call = activeCalls.get(callId);
    if (!call || !call.participants.has(socket.userId)) return;
    for (const pid of call.participants) {
      if (pid !== socket.userId) {
        io.to(`user:${pid}`).emit('peer_speaking_state', {
          from: socket.userId,
          speaking: !!speaking,
          lastSpokeAt: lastSpokeAt || Date.now(),
          callId,
        });
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET PARTICIPANTS INFO  (client request user info khi mất data)
  // ═══════════════════════════════════════════════════════════════════════════
  socket.on('get_participants_info', async ({ callId, userIds }) => {
    if (!Array.isArray(userIds)) return;
    try {
      const users = await User.find({ _id: { $in: userIds } }).select('_id username avatar email name').lean();
      socket.emit('participants_info', {
        callId,
        users: users.map(u => ({
          _id: u._id,
          id: u._id,
          username: u.username || u.name || 'Người dùng',
          avatar: u.avatar,
        })),
      });
    } catch (err) {
      console.error('get_participants_info error:', err);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CALL BUSY
  // ═══════════════════════════════════════════════════════════════════════════
  socket.on('call_busy', ({ to }) => {
    io.to(`user:${to}`).emit('call_busy', {
      from: socket.userId,
      message: 'User is currently in another call',
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CALL SUMMARY MESSAGE  (lưu tin nhắn hệ thống)
  // ═══════════════════════════════════════════════════════════════════════════
  socket.on('call_summary', async ({ callType, status, duration, conversationId }) => {
    try {
      if (!conversationId) return;
      const conv = await Conversation.findById(conversationId).select('participants');
      if (!conv) return;
      const isParticipant = (conv.participants || []).some(p => String(p) === String(socket.userId));
      if (!isParticipant) return;

      const prefix = callType === 'video' ? '📹' : '📞';
      const typeLabel = callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại';

      let content = '';
      if (status === 'cancelled')     content = `${prefix} ${typeLabel} đã hủy`;
      else if (status === 'missed')   content = `${prefix} ${typeLabel} nhỡ`;
      else if (status === 'rejected') content = `${prefix} ${typeLabel} bị từ chối`;
      else {
        const m = Math.floor((duration || 0) / 60);
        const s = (duration || 0) % 60;
        content = `${prefix} ${typeLabel} · ${m > 0 ? `${m} phút ${s} giây` : `${s} giây`}`;
      }

      const message = await Message.create({
        conversation: conversationId,
        sender: socket.userId,
        content,
        type: 'system',
        metadata: { callType, callStatus: status, duration: duration || 0 },
        readBy: [socket.userId],
        reactions: {},
        editHistory: [],
      });

      await message.populate('sender', 'username avatar email');
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        updatedAt: new Date(),
      });

      io.to(`conversation:${conversationId}`).emit('new_message', { message, conversationId });
    } catch (err) {
      console.error('call_summary error:', err);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DISCONNECT → grace period
  // ═══════════════════════════════════════════════════════════════════════════
  socket.on('disconnect', () => {
    for (const [callId, call] of activeCalls.entries()) {
      if (!call.participants.has(socket.userId)) continue;

      const key = `${callId}:${socket.userId}`;

      // Báo các peer biết người này đang reconnecting
      for (const pid of call.participants) {
        if (pid !== socket.userId) {
          io.to(`user:${pid}`).emit('peer_reconnecting', {
            from: socket.userId,
            callId,
            conversationId: call.conversationId,
            graceMs: DISCONNECT_GRACE_MS,
          });
        }
      }

      // Đặt grace timer
      const timer = setTimeout(() => {
        disconnectTimers.delete(key);
        removeUserFromCall(callId, socket.userId);
      }, DISCONNECT_GRACE_MS);

      disconnectTimers.set(key, timer);
    }
  });
};

export const getActiveCalls = () => activeCalls;
