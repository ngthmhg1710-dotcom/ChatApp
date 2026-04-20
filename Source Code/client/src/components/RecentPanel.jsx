// RecentPanel.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { MdOutlineGroupAdd } from 'react-icons/md';
import { Search, X, MessageCircle, BellOff, UserPlus, Check, Users, ChevronRight } from 'lucide-react';
import logo from '../assets/logo.png';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';

// Helper functions (copy từ Sidebar)
function getFileUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

function isGroupConv(c) {
  return !!(c?.isGroup || c?.type === 'group' || c?.type === 'community');
}

function isPersonalSelfConv(c, user) {
  if (!c) return false;
  if (isGroupConv(c)) return false;
  const parts = c.participants || [];
  if (parts.length === 1) {
    const only = parts[0]?._id || parts[0];
    return String(only) === String(user?._id);
  }
  return false;
}

function removeAccents(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Components (copy từ Sidebar)
function AppLogo({ size = 24, className = '' }) {
  return (
    <img
      src={logo}
      alt="Chat App"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

function Avatar({ username = '', size = 'md', online, avatarUrl }) {
  const initials = (username || '').slice(0, 2).toUpperCase() || '?';
  const COLORS = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-pink-500', 'bg-amber-500', 'bg-cyan-500', 'bg-rose-500'];
  const color = COLORS[((username || '').charCodeAt(0) || 0) % COLORS.length];
  const sz = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-11 h-11 text-sm' }[size] || 'w-10 h-10 text-sm';
  const dot = size === 'sm' || size === 'xs' ? 'w-2 h-2 border' : 'w-2.5 h-2.5 border-2';

  return (
    <div className="relative flex-shrink-0">
      {avatarUrl ? (
        <img
          src={getFileUrl(avatarUrl)}
          alt={username}
          className={`${sz} rounded-full object-cover`}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div className={`${sz} rounded-full bg-pink-400 flex items-center justify-center select-none`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-yellow-300" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM12 14c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4z" />
          </svg>
        </div>
      )}
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 ${dot} rounded-full border-white ${online ? 'bg-green-500' : 'bg-gray-400'}`} />
      )}
    </div>
  );
}

function GroupAvatar({ participants = [], groupAvatar }) {
  const COLORS = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-pink-500', 'bg-amber-500', 'bg-cyan-500', 'bg-rose-500'];

  if (groupAvatar) {
    return (
      <img
        src={getFileUrl(groupAvatar)}
        alt="Group"
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />
    );
  }

  const shownMembers = participants.slice(0, 3);

  if (shownMembers.length === 0) {
    return (
      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
        <Users className="w-5 h-5 text-white" />
      </div>
    );
  }

  if (shownMembers.length === 1) {
    const member = shownMembers[0];
    const color = COLORS[(member?.username?.charCodeAt(0) || 0) % COLORS.length];
    return member?.avatar ? (
      <img
        src={getFileUrl(member.avatar)}
        alt={member.username}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />
    ) : (
      <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0`}>
        {(member?.username || '?').slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      {shownMembers.slice(0, 2).map((member, index) => {
        const color = COLORS[(member?.username?.charCodeAt(0) || 0) % COLORS.length];
        const cls = index === 0
          ? 'absolute top-0 left-0 w-6 h-6 border-2 border-white rounded-full'
          : 'absolute bottom-0 right-0 w-6 h-6 border-2 border-white rounded-full';

        return member?.avatar ? (
          <img
            key={index}
            src={getFileUrl(member.avatar)}
            alt={member.username}
            className={`${cls} object-cover`}
          />
        ) : (
          <div key={index} className={`${cls} ${color} flex items-center justify-center text-[9px] font-bold text-white`}>
            {(member?.username || '?').slice(0, 2).toUpperCase()}
          </div>
        );
      })}
    </div>
  );
}

function Tab({ label, active, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200
        ${active 
          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
    >
      {label}
      {badge > 0 && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none
            ${active ? 'bg-white/25 text-white' : 'bg-red-500 text-white'}`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
// Create Group Modal Component
function CreateGroupModal({ onClose, onCreated, currentUser }) {
  const [step, setStep] = useState(1);
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_URL}/friends`)
      .then(({ data }) => setFriends(data.data?.friends || data.data || []))
      .catch(() => toast.error('Không thể tải bạn bè'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = friends.filter(f =>
    removeAccents(f.username).toLowerCase().includes(removeAccents(searchQ).toLowerCase())
  );

  const toggle = (f) => {
    setSelected(prev =>
      prev.some(s => s._id === f._id) ? prev.filter(s => s._id !== f._id) : [...prev, f]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return toast.error('Nhập tên nhóm');
    if (selected.length < 2) return toast.error('Chọn ít nhất 2 thành viên');
    setCreating(true);
    try {
      const { data } = await axios.post(`${API_URL}/conversations/group`, {
        name: groupName.trim(),
        participantIds: selected.map(s => s._id),
      });
      toast.success(`Đã tạo nhóm "${groupName.trim()}"!`);
      onCreated(data.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tạo nhóm');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-96 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
            )}
            <h3 className="font-bold text-gray-800 text-base">
              {step === 1 ? 'Chọn thành viên' : 'Đặt tên nhóm'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 1 ? (
          <>
            {selected.length > 0 && (
              <div className="px-4 pt-3 flex flex-wrap gap-1.5">
                {selected.map(s => (
                  <div key={s._id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1">
                    <Avatar username={s.username} size="xs" avatarUrl={s.avatar} />
                    <span className="text-xs font-semibold text-blue-700">{s.username}</span>
                    <button onClick={() => toggle(s)} className="text-blue-400 hover:text-blue-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder="Tìm bạn bè..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {loading ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Không tìm thấy</p>
                </div>
              ) : filtered.map(f => {
                const isSelected = selected.some(s => s._id === f._id);
                return (
                  <button key={f._id} onClick={() => toggle(f)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition mb-0.5
                      ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <Avatar username={f.username} size="md" avatarUrl={f.avatar} />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-gray-800 truncate">{f.username}</p>
                      <p className="text-xs text-gray-400 truncate">{f.email}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition flex-shrink-0
                      ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="px-4 py-3 border-t border-gray-100">
              <button onClick={() => { if (selected.length < 2) { toast.error('Chọn ít nhất 2 thành viên'); return; } setStep(2); }}
                disabled={selected.length < 2}
                className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-40">
                Tiếp theo ({selected.length} đã chọn)
              </button>
            </div>
          </>
        ) : (
          <div className="p-5 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-violet-500 rounded-full flex items-center justify-center shadow-lg">
                <Users className="w-10 h-10 text-white" />
              </div>
              <div className="flex -space-x-2">
                {selected.slice(0, 5).map((s, i) => (
                  <div key={i} className="ring-2 ring-white rounded-full">
                    <Avatar username={s.username} size="sm" avatarUrl={s.avatar} />
                  </div>
                ))}
                {selected.length > 5 && (
                  <div className="w-8 h-8 bg-gray-200 rounded-full ring-2 ring-white flex items-center justify-center text-xs font-bold text-gray-600">
                    +{selected.length - 5}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400">{selected.length + 1} thành viên</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tên nhóm</label>
              <input
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                placeholder="Nhập tên nhóm..."
                maxLength={100}
                autoFocus
                className="mt-1.5 w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
              <p className="text-[10px] text-gray-400 mt-1">{groupName.length}/100 ký tự</p>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-600">
              💡 Nhóm dưới 300 thành viên là nhóm thường. Trên 300 sẽ chuyển thành nhóm cộng đồng.
            </div>

            <button onClick={handleCreate} disabled={creating || !groupName.trim()}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-40 flex items-center justify-center gap-2">
              {creating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {creating ? 'Đang tạo...' : 'Tạo nhóm'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
// RecentPanel Component
function RecentPanel({ onSelectConversation, activeConversationId, socket, user, unreadCounts = {}, activeCall, onlineUsers: externalOnlineUsers }) {
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [addFriendQuery, setAddFriendQuery] = useState('');
  const [addFriendResults, setAddFriendResults] = useState([]);
  const [addFriendSearching, setAddFriendSearching] = useState(false);
  const [friends, setFriends] = useState([]);
  const [sentRequests, setSentRequests] = useState(new Set());
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchHits, setMessageSearchHits] = useState([]);
  const [searchMsgLoading, setSearchMsgLoading] = useState(false);
  const [localOnlineUsers, setLocalOnlineUsers] = useState(new Set());
  const onlineUsers = externalOnlineUsers || localOnlineUsers;
  const setOnlineUsers = setLocalOnlineUsers;

  const [muteMap, setMuteMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('chat_mute_map') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const onStorage = () => {
      try { setMuteMap(JSON.parse(localStorage.getItem('chat_mute_map') || '{}')); } catch { }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('chat-mute-map-updated', onStorage);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('chat-mute-map-updated', onStorage); };
  }, []);

  const searchTimer = useRef(null);
  const addFriendTimer = useRef(null);

  // Fetch friends
  useEffect(() => {
    fetchFriends();
  }, []);

  useEffect(() => {
    fetchConversations();
  }, []);

  // Socket events
  useEffect(() => {
    if (!socket) return;
    
    // Nếu có prop từ Sidebar thì không cần tự quản lý socket ở đây
    if (externalOnlineUsers) return;

    const onOnlineList = (ids) => setOnlineUsers(new Set(ids.map(String)));
    const onOnline = ({ userId }) => setOnlineUsers((prev) => new Set([...prev, String(userId)]));
    const onOffline = ({ userId }) =>
      setOnlineUsers((prev) => {
        const n = new Set(prev);
        n.delete(String(userId));
        return n;
      });
    const onNewMsg = ({ message, conversationId }) => {
      setConversations((prev) => {
        const existing = prev.find((c) => c._id === conversationId);
        if (existing && isGroupConv(existing)) {
          const userIdStr = String(user?._id);
          const isActiveMember = (existing.participants || []).some(
            (p) => String(p?._id || p) === userIdStr
          );
          if (!isActiveMember) return prev;
        }
        return [...prev.map((c) =>
          c._id === conversationId
            ? { ...c, lastMessage: message, updatedAt: message.createdAt }
            : c
        )].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    socket.on('online_users_list', onOnlineList);
    socket.on('online_users', onOnlineList);
    socket.on('user_online', onOnline);
    socket.on('user_offline', onOffline);
    socket.on('new_message', onNewMsg);

    return () => {
      socket.off('online_users_list', onOnlineList);
      socket.off('online_users', onOnlineList);
      socket.off('user_online', onOnline);
      socket.off('user_offline', onOffline);
      socket.off('new_message', onNewMsg);
    };
  }, [socket, user, externalOnlineUsers]);

  // Search messages
  useEffect(() => {
    if (!searchQuery.trim()) {
      setMessageSearchHits([]);
      setSearchMsgLoading(false);
      return;
    }

    setSearchMsgLoading(true);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${API_URL}/messages/search`, {
          params: { q: searchQuery.trim(), scope: 'all' },
        });
        setMessageSearchHits(data.data || []);
      } catch {
        setMessageSearchHits([]);
      } finally {
        setSearchMsgLoading(false);
      }
    }, 280);
  }, [searchQuery]);

  // Search users for add friend
  useEffect(() => {
    if (!addFriendQuery.trim()) {
      setAddFriendResults([]);
      setAddFriendSearching(false);
      return;
    }

    setAddFriendSearching(true);
    clearTimeout(addFriendTimer.current);
    addFriendTimer.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${API_URL}/users/search?q=${encodeURIComponent(addFriendQuery.trim())}`);
        setAddFriendResults(data.data?.users || data.data || []);
      } catch {
        setAddFriendResults([]);
      } finally {
        setAddFriendSearching(false);
      }
    }, 300);
  }, [addFriendQuery]);

  const fetchConversations = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/conversations`);
      const list = data.data?.conversations || data.data || [];
      setConversations(list);
      
      // ✅ FIX: Cập nhật danh sách online ban đầu từ dữ liệu fetch được
      const initialOnline = new Set();
      list.forEach(conv => {
        conv.participants?.forEach(p => {
          if (p.isOnline) initialOnline.add(String(p._id || p));
        });
      });
      setOnlineUsers(prev => new Set([...prev, ...initialOnline]));
      
      // ✅ FIX: Yêu cầu server gửi danh sách online thực tế nhất (từ Redis/Memory)
      if (socket && list.length) {
        const uids = list.flatMap(c => (c.participants || []).map(p => p._id || p));
        socket.emit('get_online_users', [...new Set(uids)]);
      }
    } catch {}
  };

  const fetchFriends = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/friends`);
      const list = Array.isArray(data.data) ? data.data : data.data?.friends || [];
      setFriends(list);
      if (socket && list.length) socket.emit('get_online_users', list.map((f) => f._id));
    } catch {}
  };

  const sendFriendRequest = async (userId, userPayload) => {
    try {
      await axios.post(`${API_URL}/friends/request/${userId}`);
      const idStr = String(userId);
      setSentRequests((prev) => new Set([...prev, idStr]));
      toast.success('Đã gửi lời mời kết bạn!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gửi lời mời');
    }
  };

  const cancelFriendRequest = async (userId) => {
    try {
      await axios.delete(`${API_URL}/friends/request/${userId}`);
      setSentRequests((prev) => {
        const n = new Set(prev);
        n.delete(userId);
        return n;
      });
      toast('Đã hủy lời mời');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể hủy lời mời');
    }
  };
  const handleGroupCreated = (newGroup) => {
    setConversations(prev => [newGroup, ...prev]);
    onSelectConversation?.(newGroup);
  };

  const isFriend = (uid) => friends.some((f) => String(f._id) === String(uid));

  const getOtherParticipant = (conv) => {
    if (isGroupConv(conv)) return { username: conv.name || 'Nhóm', _id: conv._id };
    return conv.participants?.find((p) => (p._id || p) !== user?._id) || {};
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if ((Date.now() - d) / 3600000 < 24) {
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const getLastMessagePreview = (conv) => {
    const lm = conv.lastMessage;
    if (!lm) return 'Bắt đầu trò chuyện...';
    if (lm.type === 'image') return '🖼️ Ảnh';
    if (lm.type === 'file') return '📎 ' + (lm.fileName || 'File');
    return lm.content || 'Bắt đầu trò chuyện...';
  };

  const totalUnread = useMemo(() => {
    try {
      return conversations.reduce((s, c) => s + ((muteMap[c._id] ?? false) ? 0 : (unreadCounts[c._id] || 0)), 0);
    } catch {
      return conversations.reduce((s, c) => s + (unreadCounts[c._id] || 0), 0);
    }
  }, [conversations, unreadCounts, muteMap]);

  let displayConversations = searchQuery.trim() ? messageSearchHits.map(hit => hit.conversation) : conversations;
  // Hide personal self-chat (cloud/personal) from the recent list — show it only in the Lưu trữ panel
  displayConversations = displayConversations.filter((c) => !isPersonalSelfConv(c, user));

  return (
    <div className="h-full w-full flex flex-col bg-white rounded-2xl overflow-hidden shadow">
      <div className="px-3 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <AppLogo size={24} />
          <span className="text-sm font-bold text-gray-800">Lumi - Gần đây</span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm"
              className="w-full pl-9 pr-8 py-2 text-sm bg-gray-100 rounded-xl border border-transparent focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setMessageSearchHits([]);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Add Friend button */}
            <div className="relative group flex items-center justify-center">
                <button
                onClick={() => setShowAddFriend(true)}
                className="w-10 h-10 flex items-center justify-center text-gray-500 rounded-xl transition-all duration-150 hover:bg-gray-100 hover:text-gray-700 active:scale-95"
                >
                <UserPlus className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 text-[11px] text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-50">
                Thêm bạn
                </div>
            </div>
          {/* Create Group button */}
            <div className="relative group flex items-center justify-center">
                <button
                    onClick={() => setShowCreateGroup(true)}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 rounded-xl transition-all duration-150 hover:bg-gray-100 hover:text-gray-700 active:scale-95"
                >
                    <MdOutlineGroupAdd className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 text-[11px] text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-50">
                    Tạo nhóm
                </div>
            </div>
        </div>

        {!searchQuery && (
          <div className="flex gap-1 mt-1">
            <Tab label="Gần đây" active={true} badge={totalUnread} onClick={() => {}} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {searchMsgLoading && (
          <div className="text-center py-10 text-gray-400">Đang tìm kiếm...</div>
        )}

        {!searchMsgLoading && searchQuery.trim() && messageSearchHits.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Không tìm thấy tin nhắn</p>
          </div>
        )}

        {/* Search results */}
        {searchQuery.trim() && messageSearchHits.map((hit) => {
          const conv = hit.conversation;
          const g = isGroupConv(conv);
          const other = !g && conv.participants?.find((p) => String(p._id) !== String(user?._id));
          const title = g ? conv.name || 'Nhóm' : other?.username || 'Người dùng';
          const unread = unreadCounts[conv._id] || 0;

          return (
            <div key={conv._id} onClick={() => onSelectConversation?.(conv)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition">
              {g ? (
                <GroupAvatar participants={conv.participants || []} groupAvatar={conv.avatar} />
              ) : (
                <Avatar username={title} size="md" avatarUrl={other?.avatar}
                  online={other ? onlineUsers.has(String(other._id)) : false} />
              )}
              <div className="flex-1 min-w-0">
                <p className="chat-text font-semibold text-gray-800 truncate">{title}</p>
                <p className="chat-preview text-blue-700 truncate">{hit.preview}</p>
              </div>
              {unread > 0 && (
                <span className="min-w-[18px] h-[18px] bg-blue-600 text-white chat-meta font-bold rounded-full flex items-center justify-center px-1">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </div>
          );
        })}

        {/* Normal conversations list */}
        {!searchQuery.trim() && displayConversations.map(conv => {
          const other = getOtherParticipant(conv);
          const isActive = conv._id === activeConversationId;
          const unread = unreadCounts[conv._id] || 0;
          const isOnline = onlineUsers.has(String(other._id));
          const isMuted = muteMap[conv._id] ?? false;
          const title = isGroupConv(conv) ? conv.name || 'Nhóm' : other.username || conv.name;
          const hasActiveCall = activeCall?.conversationId === conv._id;

          return (
            <button
              key={conv._id}
              onClick={() => onSelectConversation?.(conv)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-left mb-1
                ${isActive ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}
                ${hasActiveCall ? 'bg-green-50 border border-green-100' : ''}`}
            >
              {isGroupConv(conv) ? (
                <GroupAvatar participants={conv.participants || []} groupAvatar={conv.avatar} />
              ) : (
                <Avatar username={other.username || '?'} size="md" online={isOnline} avatarUrl={other.avatar} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-sm truncate ${
                    isActive ? 'font-bold text-blue-700' : unread > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'
                  }`}>
                    {title}
                    {hasActiveCall && <span className="ml-1.5 inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />Đang gọi
                    </span>}
                  </p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {hasActiveCall && (
                      <button onClick={(e) => { e.stopPropagation(); onSelectConversation?.(conv); }}
                        className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-md transition">
                        Tham gia
                      </button>
                    )}
                    {isMuted && <BellOff className="w-3 h-3 text-gray-400" />}
                    <span className={`text-[10px] ${unread > 0 ? 'text-blue-500 font-semibold' : 'text-gray-400'}`}>
                      {formatTime(conv.updatedAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className={`text-xs truncate max-w-[140px] ${unread > 0 ? 'text-gray-800 font-semibold' : 'text-gray-400'}`}>
                    {getLastMessagePreview(conv)}
                  </p>
                  {unread > 0 && !isMuted && (
                    <span className={`ml-2 flex-shrink-0 min-w-[18px] h-[18px] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 bg-red-500`}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {!searchQuery.trim() && conversations.length === 0 && !searchMsgLoading && (
          <div className="text-center py-12 text-gray-400 px-4">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="chat-text font-medium">Chưa có cuộc trò chuyện</p>
            <p className="chat-preview mt-1">Hãy bắt đầu trò chuyện với bạn bè!</p>
          </div>
        )}
      </div>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowAddFriend(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-2xl p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-700">Tìm người dùng</p>
              <button 
                onClick={() => {
                  setShowAddFriend(false);
                  setAddFriendQuery('');
                  setAddFriendResults([]);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                value={addFriendQuery}
                onChange={e => setAddFriendQuery(e.target.value)}
                placeholder="Nhập tên hoặc email..."
                autoFocus
                className="w-full pl-9 pr-8 py-2 text-sm bg-gray-100 rounded-xl border border-transparent focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
              {addFriendQuery && (
                <button
                  onClick={() => {
                    setAddFriendQuery('');
                    setAddFriendResults([]);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Loading */}
            {addFriendSearching && (
              <p className="text-[11px] text-gray-400 px-2 py-1">Đang tìm...</p>
            )}

            {/* Empty */}
            {!addFriendSearching && addFriendQuery && addFriendResults.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <Search className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Không tìm thấy người dùng</p>
              </div>
            )}

            {/* Hint */}
            {!addFriendQuery && (
              <div className="text-center py-6 text-gray-300">
                <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Nhập tên hoặc email để tìm</p>
              </div>
            )}

            {/* List */}
            <div className="max-h-64 overflow-y-auto">
              {addFriendResults.map(u => {
                const isMe = u._id === user?._id;
                const alreadyFriend = isFriend(u._id);
                const hasSent = sentRequests.has(u._id);

                return (
                  <div key={u._id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition">
                    
                    <Avatar username={u.username} size="md" avatarUrl={u.avatar} />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{u.username}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>

                    {isMe ? null : alreadyFriend ? (
                      <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Bạn bè
                      </span>
                    ) : hasSent ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Đã gửi</span>
                        <button
                          onClick={() => cancelFriendRequest(u._id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => sendFriendRequest(u._id)}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                      >
                        <UserPlus className="w-3 h-3" /> Kết bạn
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* Create Group Modal */}
        {showCreateGroup && (
        <CreateGroupModal
            onClose={() => setShowCreateGroup(false)}
            onCreated={handleGroupCreated}
            currentUser={user}
        />
        )}
    </div>
  );
}

export default RecentPanel;