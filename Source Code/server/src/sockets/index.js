import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { setupMessageHandlers } from './messageHandler.js';
import { setupCallHandlers } from './callHandler.js';
import { setupPresenceHandlers } from './presenceHandler.js';

let io;

export const initSocket = async (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
  });

  // Setup Redis Adapter
  try {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.io Redis Adapter initialized');
  } catch (error) {
    console.warn('⚠️  Redis Adapter not available:', error.message);
    console.log('Running Socket.io without Redis adapter (single instance mode)');
  }

  // ── Authentication middleware ────────────────────────────────────────────────
  // FIX: Query DB để lấy đủ username/email thay vì chỉ dùng JWT payload
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;

      // FIX: Lấy đầy đủ thông tin user từ DB
      const user = await User.findById(decoded.id).select('username email avatar bio isOnline').lean();
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // socket.user giờ có đầy đủ: _id, username, email, avatar, bio
      socket.user = { ...user, _id: user._id.toString() };

      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user?.username} (${socket.userId}) Socket: ${socket.id}`);

    // Join personal room
    socket.join(`user:${socket.userId}`);

    // Setup handlers
    setupPresenceHandlers(io, socket);
    setupMessageHandlers(io, socket);
    setupCallHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`❌ User disconnected: ${socket.user?.username} (${socket.userId}) - ${reason}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

export const emitToUser = (userId, event, data) => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};

export const emitToRoom = (roomId, event, data) => {
  if (io) io.to(`conversation:${roomId}`).emit(event, data);
};

export const forceUserLeaveConversation = (userId, conversationId) => {
  if (!io || !userId || !conversationId) return;
  io.in(`user:${userId}`).socketsLeave(`conversation:${conversationId}`);
};
