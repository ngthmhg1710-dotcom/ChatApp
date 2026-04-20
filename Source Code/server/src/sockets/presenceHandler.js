import User from '../models/user.model.js';
import Conversation from '../models/conversation.model.js';

const activeUsers = new Map();

export const setupPresenceHandlers = (io, socket) => {

  // FIX: Tự động đánh dấu online ngay khi connect — không cần client emit 'user_online'
  const goOnline = async () => {
    try {
      activeUsers.set(socket.userId, { socketId: socket.id, lastSeen: new Date() });

      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: new Date(),
      });

      // Tìm tất cả bạn bè và những người cùng trong các cuộc hội thoại để thông báo
      const [user, conversations] = await Promise.all([
        User.findById(socket.userId).select('friends'),
        Conversation.find({ participants: socket.userId }).select('participants')
      ]);

      const notifyIds = new Set(user?.friends?.map(f => f.toString()) || []);
      conversations.forEach(c => c.participants.forEach(p => {
        const pid = p._id ? p._id.toString() : p.toString();
        if (pid !== socket.userId) notifyIds.add(pid);
      }));

      notifyIds.forEach(id => {
        io.to(`user:${id}`).emit('user_online', { userId: socket.userId });
      });

      // Gửi lại danh sách bạn đang online cho người vừa connect
      const onlineFriends = (user?.friends || [])
        .filter(id => activeUsers.has(id.toString()))
        .map(id => id.toString());
      socket.emit('online_users_list', onlineFriends);

      console.log(`✅ User ${socket.userId} is now online`);
    } catch (error) {
      console.error('User online error:', error);
    }
  };

  // Gọi ngay khi setup (tức là khi connect)
  goOnline();

  // Vẫn giữ event này cho backward compat (useSocket emit 'user_online')
  socket.on('user_online', goOnline);

  // User disconnect
  socket.on('disconnect', async () => {
    try {
      // Chỉ xử lý nếu không còn socket nào khác của cùng user
      const remainingSockets = await io.in(`user:${socket.userId}`).fetchSockets();
      // fetchSockets trả về socket hiện tại vẫn còn trong danh sách lúc disconnect chưa hoàn toàn
      // nên check length <= 1
      if (remainingSockets.length <= 1) {
        activeUsers.delete(socket.userId);

        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        // Thông báo offline cho cả bạn bè và thành viên các cuộc hội thoại
        const [user, conversations] = await Promise.all([
          User.findById(socket.userId).select('friends'),
          Conversation.find({ participants: socket.userId }).select('participants')
        ]);

        const notifyIds = new Set(user?.friends?.map(f => f.toString()) || []);
        conversations.forEach(c => c.participants.forEach(p => {
          const pid = p._id ? p._id.toString() : p.toString();
          if (pid !== socket.userId) notifyIds.add(pid);
        }));

        notifyIds.forEach(id => {
          io.to(`user:${id}`).emit('user_offline', { userId: socket.userId });
        });

        console.log(`User ${socket.userId} is now offline`);
      }
    } catch (error) {
      console.error('User offline error:', error);
    }
  });

  // Get online status của danh sách user IDs
  socket.on('get_online_users', (userIds) => {
    const onlineList = (userIds || []).filter(id => activeUsers.has(id.toString()));
    socket.emit('online_users', onlineList);
  });
};

export const isUserOnline = (userId) => activeUsers.has(userId.toString());
export const getOnlineUsers = () => Array.from(activeUsers.keys());