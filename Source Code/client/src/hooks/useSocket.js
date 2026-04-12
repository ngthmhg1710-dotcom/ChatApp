import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const { token, user } = useAuthStore();

  useEffect(() => {
    if (!token || !user) return;

    // Tránh tạo nhiều connection
    if (socket?.connected) {
      setIsConnected(true);
      return;
    }

    // Disconnect socket cũ nếu còn
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      setIsConnected(true);
      // FIX: emit user_online sau mỗi lần connect/reconnect
      // (server cũng tự xử lý nhưng giữ để đảm bảo)
      socket.emit('user_online');
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);
    });

    // Reconnect thành công → emit lại user_online
    socket.on('reconnect', () => {
      console.log('🔄 Socket reconnected');
      socket.emit('user_online');
    });

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
        setIsConnected(false);
      }
    };
  }, [token, user?._id]);

  return { socket, isConnected };
};

export const getSocket = () => socket;