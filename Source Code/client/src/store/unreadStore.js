// client/src/store/unreadStore.js
// Tạo file MỚI

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUnreadStore = create(
  persist(
    (set, get) => ({
      unreadCounts: {}, // { conversationId: count }
      
      // Set unread count cho 1 conversation
      setUnreadCount: (conversationId, count) => {
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [conversationId]: Math.max(0, count)
          }
        }));
      },
      
      // Increment unread count
      incrementUnread: (conversationId) => {
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [conversationId]: (state.unreadCounts[conversationId] || 0) + 1
          }
        }));
      },
      
      // Reset unread count (mark as read)
      resetUnreadCount: (conversationId) => {
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [conversationId]: 0
          }
        }));
      },
      
      // Sync multiple conversations (from API)
      syncUnreadCounts: (conversations) => {
        const newCounts = {};
        conversations.forEach(conv => {
          if (conv.unreadCount !== undefined) {
            newCounts[conv._id] = conv.unreadCount;
          }
        });
        set({ unreadCounts: newCounts });
      },
      
      // Clear all (logout)
      clearUnreadCounts: () => {
        set({ unreadCounts: {} });
      }
    }),
    {
      name: 'unread-storage', // localStorage key
      getStorage: () => localStorage
    }
  )
);

export default useUnreadStore;