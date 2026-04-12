import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import toast from 'react-hot-toast';

import { getCurrentUser, login as loginRequest, register as registerRequest } from '../services/authService';
import { upsertDeviceSession } from '../utils/deviceSession';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,

      register: async (userData) => {
        set({ loading: true });
        try {
          await registerRequest(userData);
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
          const response = await loginRequest(credentials);
          const { user, token } = response.data.data;

          set({ user, token, loading: false });
          axios.defaults.headers.common.Authorization = `Bearer ${token}`;

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
        // Ghi lại thời điểm đăng xuất cho phiên thiết bị hiện tại
        upsertDeviceSession({ loggedOutAt: new Date().toISOString() });

        // Remove dark class khi logout — trang public không dùng dark mode
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
        delete axios.defaults.headers.common.Authorization;
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
          const { data } = await getCurrentUser();
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
const persistedAuth = (() => {
  try {
    return JSON.parse(localStorage.getItem('auth-storage') || '{}');
  } catch {
    return {};
  }
})();

const token = persistedAuth?.state?.token;
if (token) {
  axios.defaults.headers.common.Authorization = `Bearer ${token}`;
}

// Theme chỉ được apply trong Chat (Sidebar), không apply ở trang public
