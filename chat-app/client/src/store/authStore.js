import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function safeGetLocalStorage(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeSetLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeParseJson(str, fallback) {
  try {
    if (str === null || str === undefined) return fallback;
    const parsed = JSON.parse(str);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function getOrCreateDeviceSessionId() {
  let id = safeGetLocalStorage('deviceSessionId');
  if (!id) {
    id = `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    safeSetLocalStorage('deviceSessionId', id);
  }
  return id;
}

function getDeviceLabel() {
  if (typeof navigator === 'undefined') return 'Unknown device';
  const platform = navigator.platform || '';
  const ua = navigator.userAgent || '';
  const isWindows = /Windows/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua);
  const isLinux = /Linux/i.test(ua);
  const os = isWindows ? 'Windows' : isMac ? 'macOS' : isLinux ? 'Linux' : 'OS';
  const browser = /Chrome/i.test(ua) && !/Edg/i.test(ua)
    ? 'Chrome'
    : /Edg/i.test(ua)
      ? 'Edge'
      : /Firefox/i.test(ua)
        ? 'Firefox'
        : /Safari/i.test(ua) && !/Chrome/i.test(ua)
          ? 'Safari'
          : 'Browser';
  const shortPlatform = platform ? platform.replace(/\s+/g, ' ').trim() : os;
  return `${browser} • ${shortPlatform}`;
}

function upsertDeviceSession({ loggedOutAt = null } = {}) {
  const deviceSessionId = getOrCreateDeviceSessionId();
  const now = new Date().toISOString();
  const label = getDeviceLabel();

  const raw = safeGetLocalStorage('deviceSessions');
  const sessions = safeParseJson(raw, []);
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const idx = safeSessions.findIndex((s) => s?.id === deviceSessionId);

  const next = {
    id: deviceSessionId,
    label,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    createdAt: idx >= 0 ? safeSessions[idx].createdAt : now,
    lastActiveAt: now,
    loggedOutAt,
  };

  if (idx >= 0) safeSessions[idx] = { ...safeSessions[idx], ...next };
  else safeSessions.push(next);

  safeSetLocalStorage('deviceSessions', JSON.stringify(safeSessions));
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,

      register: async (userData) => {
        set({ loading: true });
        try {
          await axios.post(`${API_URL}/auth/register`, userData);
          set({ loading: false });
          toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.');
          return true;
        } catch (error) {
          set({ loading: false });
          toast.error(error.response?.data?.message || 'Đăng ký thất bại');
          return false;
        }
      },

      login: async (credentials) => {
        set({ loading: true });
        try {
          const response = await axios.post(`${API_URL}/auth/login`, credentials);
          const { user, token } = response.data.data;

          set({ user, token, loading: false });
          localStorage.setItem('token', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Lưu phiên "thiết bị đã đăng nhập" cục bộ trong trình duyệt
          upsertDeviceSession();

          toast.success('Đăng nhập thành công!');
          return true;
        } catch (error) {
          set({ loading: false });
          toast.error(error.response?.data?.message || 'Đăng nhập thất bại');
          return false;
        }
      },

      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem('token');

        // Ghi lại thời điểm đăng xuất cho phiên thiết bị hiện tại
        upsertDeviceSession({ loggedOutAt: new Date().toISOString() });

        // Remove dark class khi logout — trang public không dùng dark mode
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
        delete axios.defaults.headers.common['Authorization'];
        toast.success('Đã đăng xuất');
      },

      // FIX: updateUser merge đúng, giữ nguyên các field không thay đổi
      updateUser: (userData) => {
        const current = get().user;
        set({ user: { ...current, ...userData } });
      },

      // Refresh user từ server (dùng sau khi upload avatar)
      refreshUser: async () => {
        try {
          const { data } = await axios.get(`${API_URL}/auth/me`);
          const current = get().user;
          set({ user: { ...current, ...data.data } });
        } catch {
          // silent fail
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

// Khôi phục token & theme khi app load
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Theme chỉ được apply trong Chat (Sidebar), không apply ở trang public
