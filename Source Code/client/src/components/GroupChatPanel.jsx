import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Search, X, Check, Users, ChevronRight, UserPlus } from 'lucide-react';
import { MdOutlineGroupAdd } from 'react-icons/md';
import logo from '../assets/logo.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';

const AVATAR_COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-pink-500','bg-amber-500','bg-cyan-500','bg-rose-500'];
function getAvatarColor(name) {
  const s = (name || '').trim();
  return s ? AVATAR_COLORS[(s.charCodeAt(0) || 0) % AVATAR_COLORS.length] : 'bg-gray-400';
}
function getFileUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}
function removeAccents(str) {
  return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g,'d').replace(/Đ/g,'D');
}

function AppLogo({ size = 24, className = '' }) {
  return (
    <img
      src={logo}
      alt="Lumi"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ username = '', size = 'md', avatarUrl, online }) {
  const initials = (username || '').slice(0, 2).toUpperCase() || '?';
  const color = getAvatarColor(username);
  const sz = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-11 h-11 text-sm' }[size] || 'w-10 h-10 text-sm';
  return (
    <div className="relative flex-shrink-0">
      {avatarUrl
        ? <img src={getFileUrl(avatarUrl)} alt={username} className={`${sz} rounded-full object-cover`} onError={e => e.target.style.display='none'} />
        : <div className={`${sz} rounded-full flex items-center justify-center select-none`}>
            <div className="w-full h-full rounded-full bg-pink-400 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-yellow-300" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM12 14c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4z" />
              </svg>
            </div>
          </div>
      }
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-gray-400'}`} />
      )}
    </div>
  );
}

// ─── Group Avatar (stack) ─────────────────────────────────────────────────────
function GroupAvatar({ participants = [], groupAvatar, onlineUsers = new Set() }) {
  if (groupAvatar) {
    return (
      <img
        src={getFileUrl(groupAvatar)}
        alt="Group"
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />
    );
  }

  const shown = participants.slice(0, 3);
  if (shown.length === 0) {
    return (
      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
        <Users className="w-5 h-5 text-white" />
      </div>
    );
  }
  if (shown.length === 1) {
    const p = shown[0];
    const isOnline = onlineUsers.has(String(p._id || p));
    return <Avatar username={p?.username || '?'} size="md" avatarUrl={p?.avatar} online={isOnline} />;
  }
  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      {shown.slice(0, 2).map((p, i) => {
        const color = getAvatarColor(p?.username);
        const initials = (p?.username || '?').slice(0, 2).toUpperCase();
        const pos = i === 0
          ? 'absolute top-0 left-0 w-6 h-6 text-[9px]'
          : 'absolute bottom-0 right-0 w-6 h-6 text-[9px]';
        return p?.avatar
          ? <img key={i} src={getFileUrl(p.avatar)} alt={p.username} className={`${pos} rounded-full object-cover border border-white`} />
          : <div key={i} className={`${pos} ${color} rounded-full flex items-center justify-center font-bold text-white border border-white`}>{initials}</div>;
      })}
    </div>
  );
}

// ─── Tab ──────────────────────────────────────────────────────────────────────
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

// ─── Create Group Modal ───────────────────────────────────────────────────────
function CreateGroupModal({ onClose, onCreated, currentUser }) {
  const [step, setStep]           = useState(1); // 1=chọn bạn, 2=đặt tên
  const [friends, setFriends]     = useState([]);
  const [selected, setSelected]   = useState([]);
  const [groupName, setGroupName] = useState('');
  const [searchQ, setSearchQ]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [creating, setCreating]   = useState(false);

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
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={() => { if (step === 1) onClose?.(); }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-96 overflow-hidden flex flex-col max-h-[80vh]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
            {/* Selected chips */}
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

            {/* Search */}
            <div className="px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder="Tìm bạn bè..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition" />
              </div>
            </div>

            {/* Friend list */}
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

            {/* Footer */}
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
            {/* Group avatar preview */}
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

// ─── Main GroupChatPanel ──────────────────────────────────────────────────────
function GroupChatPanel({ onSelectConversation, activeConversationId, socket, user, unreadCounts, onlineUsers: externalOnlineUsers }) {
  const [tab, setTab]             = useState('groups');
  const [searchQuery, setSearchQuery] = useState('');
  const [groups, setGroups]       = useState([]);
  const [friends, setFriends]     = useState([]); // for suggestions
  const [showCreate, setShowCreate] = useState(false);
  const [localOnlineUsers, setLocalOnlineUsers] = useState(new Set());
  const onlineUsers = externalOnlineUsers || localOnlineUsers;
  const setOnlineUsers = setLocalOnlineUsers;

  const [searchMsgLoading, setSearchMsgLoading] = useState(false);
  const [messageHits, setMessageHits] = useState([]);

  const [muteMap, setMuteMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chat_mute_map') || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    const onStorage = () => {
      try { setMuteMap(JSON.parse(localStorage.getItem('chat_mute_map') || '{}')); } catch { }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('chat-mute-map-updated', onStorage);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('chat-mute-map-updated', onStorage); };
  }, []);

  const activeConvRef = useRef(activeConversationId);
  const searchTimer   = useRef(null);

  useEffect(() => { activeConvRef.current = activeConversationId; }, [activeConversationId]);

  useEffect(() => {
    fetchGroups();
    fetchFriends();
  }, []);

  // Socket
  useEffect(() => {
    if (!socket) return;
    const upsertGroup = (conversation) => {
      if (!conversation?._id) return;
      setGroups((prev) => {
        const exists = prev.some((g) => g._id === conversation._id);
        if (!exists) {
          return [conversation, ...prev].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        }
        return prev
          .map((g) => (g._id === conversation._id ? { ...g, ...conversation } : g))
          .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      });
    };

    // ✅ FIX: Thêm listener cho Presence
    const onOnlineList = (ids) => setOnlineUsers(new Set(ids.map(String)));
    const onOnline = ({ userId }) => setOnlineUsers((prev) => new Set([...prev, String(userId)]));
    const onOffline = ({ userId }) => setOnlineUsers((prev) => {
      const n = new Set(prev);
      n.delete(String(userId));
      return n;
    });

    socket.on('online_users_list', onOnlineList);
    socket.on('user_online', onOnline);
    socket.on('user_offline', onOffline);

    const onNewMsg = ({ message, conversationId }) => {
      setGroups(prev =>
        [...prev.map(g => {
          if (g._id !== conversationId) return g;

          // Chỉ update lastMessage nếu user còn là active member
          const isActiveMember = (g.participants || []).some(
            p => String(p?._id || p) === String(user?._id)
          );
          if (!isActiveMember) return g; // bị kick → giữ nguyên lastMessage cũ

          return { ...g, lastMessage: message, updatedAt: message.createdAt };
        })].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
    };
    const onGroupCreated    = () => fetchGroups();
    const onAddedToGroup    = ({ conversation }) => {
      if (conversation) upsertGroup(conversation);
      else fetchGroups();
      toast.success('Bạn đã được thêm vào nhóm!');
    };
    const onRemovedFromGroup = ({ conversation }) => {
      if (conversation) upsertGroup(conversation);
      else fetchGroups();
      toast('Bạn không còn là thành viên của nhóm này');
    };
    const onGroupDissolved  = ({ conversation }) => {
      if (conversation) upsertGroup(conversation);
      else fetchGroups();
      toast('Nhóm đã bị giải tán');
    };
    const onGroupUpdated = ({ conversation }) => {
      if (conversation) upsertGroup(conversation);
    };
    const onMemberAdded = ({ conversation }) => {
      if (conversation) upsertGroup(conversation);
    };
    const onMemberRemoved = ({ conversation }) => {
      if (conversation) upsertGroup(conversation);
    };
    const onMemberLeft = ({ conversation }) => {
      if (conversation) upsertGroup(conversation);
    };
    const onPromotedToAdmin = ({ conversation }) => {
      if (conversation) upsertGroup(conversation);
    };

    socket.on('new_message',        onNewMsg);
    socket.on('group_created',      onGroupCreated);
    socket.on('added_to_group',     onAddedToGroup);
    socket.on('removed_from_group', onRemovedFromGroup);
    socket.on('group_dissolved',    onGroupDissolved);
    socket.on('group_updated',      onGroupUpdated);
    socket.on('member_added',       onMemberAdded);
    socket.on('member_removed',     onMemberRemoved);
    socket.on('member_left',        onMemberLeft);
    socket.on('promoted_to_admin',  onPromotedToAdmin);
    return () => {
      socket.off('online_users_list', onOnlineList);
      socket.off('user_online', onOnline);
      socket.off('user_offline', onOffline);
      socket.off('new_message',        onNewMsg);
      socket.off('group_created',      onGroupCreated);
      socket.off('added_to_group',     onAddedToGroup);
      socket.off('removed_from_group', onRemovedFromGroup);
      socket.off('group_dissolved',    onGroupDissolved);
      socket.off('group_updated',      onGroupUpdated);
      socket.off('member_added',       onMemberAdded);
      socket.off('member_removed',     onMemberRemoved);
      socket.off('member_left',        onMemberLeft);
      socket.off('promoted_to_admin',  onPromotedToAdmin);
    };
  }, [socket]);

  /** Chỉ nhóm: tìm theo nội dung tin nhắn (API) + tên nhóm nếu chưa có trong kết quả */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setMessageHits([]);
      setSearchMsgLoading(false);
      return;
    }
    setSearchMsgLoading(true);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const kw = removeAccents(searchQuery).toLowerCase();
      try {
        const { data } = await axios.get(`${API_URL}/messages/search`, {
          params: { q: searchQuery.trim(), scope: 'group' },
        });
        const apiHits = data.data || [];
        const seen = new Set(apiHits.map((h) => String(h.conversation._id)));
        const nameOnly = groups.filter((g) =>
          removeAccents(g.name || '').toLowerCase().includes(kw) &&
          !seen.has(String(g._id))
        ).map((g) => ({
          conversation: g,
          preview: 'Khớp tên nhóm',
          message: { _id: `name-${g._id}` },
        }));
        setMessageHits([...apiHits, ...nameOnly]);
      } catch {
        setMessageHits([]);
      } finally {
        setSearchMsgLoading(false);
      }
    }, 280);
  }, [searchQuery, groups]);

  const fetchGroups = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/conversations`);
      const list = (data.data?.conversations || data.data || []).filter(c => c.isGroup || c.type === 'group' || c.type === 'community');
      setGroups(list);
      
      // ✅ FIX: Cập nhật online ban đầu cho nhóm
      const initialOnline = new Set();
      list.forEach(g => g.participants?.forEach(p => { if (p.isOnline) initialOnline.add(String(p._id || p)); }));
      setOnlineUsers(prev => new Set([...prev, ...initialOnline]));

      if (socket && list.length) {
        const uids = list.flatMap(g => (g.participants || []).map(p => p._id || p));
        socket.emit('get_online_users', [...new Set(uids)]);
      }
    } catch {}
  };

  const fetchFriends = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/friends`);
      setFriends(data.data?.friends || data.data || []);
    } catch {}
  };

  const handleSelect = (g) => {
    onSelectConversation?.(g);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if ((Date.now() - d) / 3600000 < 24)
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const getLastMessagePreview = (g) => {
    const lm = g.lastMessage;
    if (!lm) return 'Chưa có tin nhắn';
    const prefix = lm.sender?.username ? `${lm.sender.username}: ` : '';
    if (lm.type === 'image') return `${prefix}🖼️ Ảnh`;
    if (lm.type === 'file')  return `${prefix}📎 File`;
    return `${prefix}${lm.content || ''}`;
  };

  // Gợi ý nhóm chung với bạn bè
  const suggestedFriends = friends.filter(f => {
    const sharedGroups = groups.filter(g =>
      g.participants?.some(p => (p._id || p)?.toString() === f._id?.toString())
    );
    return sharedGroups.length > 0;
  }).slice(0, 5);

  const totalUnread = useMemo(() => {
    try {
      return Object.entries(unreadCounts).reduce((sum, [convId, count]) => {
        return sum + ((muteMap[convId] ?? false) ? 0 : count);
      }, 0);
    } catch {
      return Object.values(unreadCounts).reduce((a, b) => a + b, 0);
    }
  }, [unreadCounts, muteMap]);

  return (
    <div className="h-full w-full bg-white dark:bg-gray-800 flex flex-col overflow-hidden">

  {/* Header */}
  <div className="px-3 pt-3 pb-2 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
    <div className="flex items-center gap-2 mb-3">
      <AppLogo size={24} />
      <span className="text-sm font-bold text-gray-800 dark:text-white">Lumi - Nhóm</span>
    </div>

    <div className="flex items-center gap-2 mb-2">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm"
          className="w-full pl-9 pr-8 py-2 text-sm bg-gray-100 dark:bg-gray-700 dark:text-white rounded-xl border border-transparent focus:border-blue-400 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="relative group flex-shrink-0">
        <button onClick={() => setShowCreate(true)}
          className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition active:scale-95">
          <MdOutlineGroupAdd className="w-5 h-5" />
        </button>
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 text-[11px] text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-50">
          Tạo nhóm
        </div>
      </div>
    </div>

    {!searchQuery && (
      <div className="flex gap-1">
        <Tab label="Nhóm" active={tab === 'groups'} badge={totalUnread} onClick={() => setTab('groups')} />
        <Tab label="Đề xuất" active={tab === 'suggest'} onClick={() => setTab('suggest')} />
      </div>
    )}
  </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">

        {/* Search results */}
        {searchQuery && (
          <div className="p-2">
            {searchMsgLoading && <p className="text-[11px] text-gray-400 px-2 py-2">Đang tìm trong tin nhắn nhóm...</p>}
            {!searchMsgLoading && messageHits.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Không tìm thấy kết quả</p>
              </div>
            )}

            {messageHits.length > 0 && (
              <>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 pt-2 pb-1">
                  Tin nhắn (nhóm) · {messageHits.length}
                </p>
                <p className="text-[10px] text-gray-400 px-2 pb-2 leading-snug">
                  Cuộc nhóm có tin chứa từ khóa hoặc tên nhóm khớp.
                </p>
                {messageHits.map((hit) => {
                  const g = hit.conversation;
                  const unread = unreadCounts[g._id] || 0;
                  const isActive = g._id === activeConversationId;
                  return (
                    <button key={g._id} type="button" onClick={() => handleSelect(g)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-left mb-0.5
                        ${isActive ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}>
                      <GroupAvatar participants={g.participants || []} groupAvatar={g.avatar} onlineUsers={onlineUsers} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-800 truncate">{g.name}</p>
                          <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">{formatTime(g.updatedAt)}</span>
                        </div>
                        <p className="text-xs text-blue-700/90 truncate font-medium">{hit.preview}</p>
                      </div>
                      {unread > 0 && !(muteMap[g._id] ?? false) && (
                        <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 flex-shrink-0">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Group list tab */}
        {!searchQuery && tab === 'groups' && (
          <div className="p-2">
            {groups.length === 0 ? (
              <div className="text-center py-12 text-gray-400 px-4">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Chưa có nhóm nào</p>
                <p className="text-xs mt-1">Tạo nhóm mới để bắt đầu!</p>
                <button onClick={() => setShowCreate(true)}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition">
                  Tạo nhóm
                </button>
              </div>
            ) : groups.map(g => {
              const unread   = unreadCounts[g._id] || 0;
              const isActive = g._id === activeConversationId;
              const memberCount = g.participants?.length || 0;
              const isCurrentMember = g.participants?.some((p) => String(p?._id || p) === String(user?._id));
              const isDissolved = !!g.dissolvedAt;
              return (
                <button key={g._id} onClick={() => handleSelect(g)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-left mb-0.5
                    ${isActive ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}>
                  <GroupAvatar participants={g.participants || []} groupAvatar={g.avatar} onlineUsers={onlineUsers} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${isActive ? 'font-bold text-blue-700' : unread > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                        {g.name}
                      </p>
                      <span className={`text-[10px] flex-shrink-0 ml-1 ${unread > 0 ? 'text-blue-500 font-semibold' : 'text-gray-400'}`}>
                        {formatTime(g.updatedAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`text-xs truncate max-w-[140px] ${unread > 0 ? 'text-gray-800 font-semibold' : 'text-gray-400'}`}>
                        {getLastMessagePreview(g)}
                      </p>
                      {unread > 0 && !(muteMap[g._id] ?? false) && (
                        <span className="ml-2 flex-shrink-0 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] mt-0.5 ${
                      isDissolved ? 'text-red-400' : !isCurrentMember ? 'text-amber-500' : 'text-gray-400'
                    }`}>
                      {isDissolved
                        ? '🚫 Đã giải tán'
                        : !isCurrentMember
                        ? '👁️ Chỉ xem lịch sử'
                        : memberCount >= 300
                        ? '🌐 Cộng đồng'
                        : `👥 ${memberCount} thành viên`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Suggest tab */}
        {!searchQuery && tab === 'suggest' && (
          <div className="p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 pb-2">
              Bạn bè đang trong nhóm
            </p>
            {suggestedFriends.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có đề xuất</p>
                <p className="text-xs mt-1">Mời bạn bè vào nhóm để thấy đề xuất</p>
              </div>
            ) : suggestedFriends.map(f => {
              const sharedGroups = groups.filter(g =>
                g.participants?.some(p => (p._id || p)?.toString() === f._id?.toString())
              );
              return (
                <div key={f._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition">
                  <Avatar username={f.username} size="md" avatarUrl={f.avatar} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{f.username}</p>
                    <p className="text-xs text-gray-400 truncate">
                      Chung {sharedGroups.length} nhóm: {sharedGroups.map(g => g.name).join(', ')}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* All friends not in any group */}
            {friends.filter(f => !groups.some(g => g.participants?.some(p => (p._id||p)?.toString() === f._id?.toString()))).length > 0 && (
              <>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 pt-4 pb-2">
                  Mời bạn bè vào nhóm
                </p>
                {friends.filter(f => !groups.some(g => g.participants?.some(p => (p._id||p)?.toString() === f._id?.toString()))).slice(0, 5).map(f => (
                  <div key={f._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition">
                    <Avatar username={f.username} size="md" avatarUrl={f.avatar} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{f.username}</p>
                      <p className="text-xs text-gray-400">Chưa có nhóm chung</p>
                    </div>
                    <button onClick={() => setShowCreate(true)}
                      className="flex-shrink-0 text-xs px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
                      Mời
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Create group modal */}
      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={(newGroup) => {
            setGroups(prev => [newGroup, ...prev]);
            handleSelect(newGroup);
          }}
          currentUser={user}
        />
      )}
    </div>
  );
}

export default GroupChatPanel;
