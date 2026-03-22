import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
