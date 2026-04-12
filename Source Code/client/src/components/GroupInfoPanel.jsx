import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  X, Search, UserPlus, UserMinus, LogOut, Trash2,
  Users, Crown, Calendar, Shield, ChevronRight,
  Edit3, Check, AlertTriangle, Bell, BellOff,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';
const MAX_MEMBERS = 300;
const COMMUNITY_THRESHOLD = 300;

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
  return (str||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D');
}
function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function Avatar({ username = '', size = 'md', avatarUrl }) {
  const initials = (username||'').slice(0,2).toUpperCase() || '?';
  const color = getAvatarColor(username);
  const sz = { xs:'w-6 h-6 text-[10px]', sm:'w-8 h-8 text-xs', md:'w-10 h-10 text-sm', lg:'w-12 h-12 text-base', xl:'w-16 h-16 text-xl' }[size] || 'w-10 h-10 text-sm';
  return avatarUrl
    ? <img src={getFileUrl(avatarUrl)} alt={username} className={`${sz} rounded-full object-cover flex-shrink-0`} onError={e=>e.target.style.display='none'} />
    : <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold text-white select-none flex-shrink-0`}>{initials}</div>;
}

function GroupAvatarStack({ participants = [], groupAvatar, size = 'xl' }) {
  const shown = participants.slice(0, 2);

  if (groupAvatar) {
    const sz = size === 'xl' ? 'w-20 h-20' : 'w-16 h-16';
    return <img src={getFileUrl(groupAvatar)} alt="Group" className={`${sz} rounded-full object-cover shadow-lg`} />;
  }

  if (shown.length === 0) {
    const sz = size === 'xl' ? 'w-20 h-20' : 'w-16 h-16';
    return (
      <div className={`${sz} bg-gradient-to-br from-blue-400 to-violet-500 rounded-full flex items-center justify-center shadow-lg`}>
        <Users className={`${size === 'xl' ? 'w-10 h-10' : 'w-8 h-8'} text-white`} />
      </div>
    );
  }

  if (shown.length === 1) {
    return <Avatar username={shown[0]?.username || '?'} size={size} avatarUrl={shown[0]?.avatar} />;
  }

  return (
    <div className="relative w-20 h-20">
      {shown.map((member, index) => {
        const cls = index === 0
          ? 'absolute top-0 left-0 w-12 h-12 border-2 border-white rounded-full'
          : 'absolute bottom-0 right-0 w-12 h-12 border-2 border-white rounded-full';
        const color = getAvatarColor(member?.username);
        return member?.avatar ? (
          <img key={index} src={getFileUrl(member.avatar)} alt={member.username} className={`${cls} object-cover`} />
        ) : (
          <div key={index} className={`${cls} ${color} flex items-center justify-center text-sm font-bold text-white`}>
            {(member?.username || '?').slice(0, 2).toUpperCase()}
          </div>
        );
      })}
    </div>
  );
}

function ConfirmDialog({ title, message, onConfirm, onCancel, danger = true, confirmLabel = 'Xác nhận', requireDouble = false }) {
  const [step, setStep] = useState(requireDouble ? 1 : 2);
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-80 p-6 flex flex-col gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${danger ? 'bg-red-100' : 'bg-blue-100'}`}>
          <AlertTriangle className={`w-6 h-6 ${danger ? 'text-red-500' : 'text-blue-500'}`} />
        </div>
        <div className="text-center">
          <p className="font-bold text-gray-800 text-base">{title}</p>
          <p className="text-sm text-gray-500 mt-1.5">{step === 1 ? 'Bấm tiếp để xác nhận hành động này.' : message}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">Hủy</button>
          {step === 1
            ? <button onClick={() => setStep(2)} className="flex-1 py-2 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition">Tiếp tục</button>
            : <button onClick={onConfirm} className={`flex-1 py-2 text-white text-sm font-semibold rounded-xl transition ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}>{confirmLabel}</button>
          }
        </div>
      </div>
    </div>
  );
}

// ✅ AddMemberModal — cho phép thêm từ 1 người (không giới hạn tối thiểu)
function AddMemberModal({ conversation, onClose, onAdded, currentUser }) {
  const [friends, setFriends] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [adding, setAdding]   = useState(new Set());
  const [added, setAdded]     = useState(new Set());
  const [loading, setLoading] = useState(true);

  const currentMembers = new Set((conversation.participants || []).map(p => (p._id||p)?.toString()));
  const memberCount = conversation.participants?.length || 0;
  const canAdd = memberCount < MAX_MEMBERS;

  useEffect(() => {
    axios.get(`${API_URL}/friends`)
      .then(({ data }) => setFriends(data.data?.friends || data.data || []))
      .catch(() => toast.error('Không thể tải bạn bè'))
      .finally(() => setLoading(false));
  }, []);

  const eligible = friends.filter(f =>
    !currentMembers.has(f._id?.toString()) &&
    removeAccents(f.username||'').toLowerCase().includes(removeAccents(searchQ).toLowerCase())
  );

  const handleAdd = async (friend) => {
    if (!canAdd) { toast.error(`Nhóm đã đủ ${MAX_MEMBERS} thành viên`); return; }
    setAdding(prev => new Set([...prev, friend._id]));
    try {
      const { data } = await axios.post(`${API_URL}/conversations/${conversation._id}/participants`, { userId: friend._id });
      setAdded(prev => new Set([...prev, friend._id]));
      toast.success(`Đã thêm ${friend.username} vào nhóm`);
      onAdded(data.data || friend);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể thêm thành viên');
    } finally {
      setAdding(prev => { const n = new Set(prev); n.delete(friend._id); return n; });
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-80 overflow-hidden flex flex-col max-h-[75vh]">
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800 text-base">Thêm thành viên</h3>
            <p className="text-xs text-gray-400 mt-0.5">{memberCount}/{MAX_MEMBERS} thành viên hiện tại</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"><X className="w-4 h-4" /></button>
        </div>
        {!canAdd && (
          <div className="mx-4 mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-700">
            ⚠️ Nhóm đã đủ {MAX_MEMBERS} thành viên. Không thể thêm.
          </div>
        )}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Tìm bạn bè..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition" />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{eligible.length} bạn bè có thể thêm</p>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {loading
            ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
            : eligible.length === 0
              ? <div className="text-center py-8 text-gray-400"><Users className="w-8 h-8 mx-auto mb-2 opacity-40" /><p className="text-sm">{searchQ ? 'Không tìm thấy' : 'Tất cả bạn bè đã trong nhóm'}</p></div>
              : eligible.map(f => {
                  const isAdded  = added.has(f._id);
                  const isAdding = adding.has(f._id);
                  return (
                    <div key={f._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition">
                      <Avatar username={f.username} size="md" avatarUrl={f.avatar} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{f.username}</p>
                        <p className="text-xs text-gray-400 truncate">{f.email}</p>
                      </div>
                      <button onClick={() => handleAdd(f)} disabled={isAdded || isAdding || !canAdd}
                        className={`flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition
                          ${isAdded ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40'}`}>
                        {isAdded ? <><Check className="w-3 h-3" /> Đã thêm</> : isAdding ? '...' : <><UserPlus className="w-3 h-3" /> Thêm</>}
                      </button>
                    </div>
                  );
                })
          }
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <button onClick={onClose} className="w-full py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-2xl hover:bg-gray-200 transition">
            {added.size > 0 ? `Đã thêm ${added.size} người · Đóng` : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GroupInfoPanel({
  conversation, currentUser, onClose, socket,
  onGroupLeft, onGroupDissolved, onConversationUpdated,
  muteMap, onMuteChange,
}) {
  const [members, setMembers]           = useState(conversation?.participants || []);
  const [memberSearch, setMemberSearch] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [confirm, setConfirm]           = useState(null);
  const [editingName, setEditingName]   = useState(false);
  const [newName, setNewName]           = useState(conversation?.name || '');
  const [loading, setLoading]           = useState(false);

  const isAdmin = conversation?.admin?._id?.toString() === currentUser?._id?.toString()
    || conversation?.admin?.toString() === currentUser?._id?.toString();
  const isCurrentMember = members.some((mem) => (mem?._id || mem)?.toString() === currentUser?._id?.toString());
  const isDissolved = !!conversation?.dissolvedAt;
  const allowMembersAddParticipants = conversation?.permissions?.allowMembersAddParticipants !== false;
  const canAddMembers = isCurrentMember && !isDissolved && (isAdmin || allowMembersAddParticipants);
  const memberCount = members.length;
  const isCommunity = memberCount >= COMMUNITY_THRESHOLD;
  const muteNotif   = muteMap ? (muteMap[conversation?._id] ?? false) : false;

  useEffect(() => {
    setMembers(conversation?.participants || []);
    setNewName(conversation?.name || '');
  }, [conversation]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = ({ conversation: upd }) => {
      if (upd?._id === conversation?._id) {
        setMembers(upd.participants || []);
        setNewName(upd.name || '');
        onConversationUpdated?.(upd);
      }
    };
    const onPromoted = ({ conversation: upd, message }) => {
      if (upd?._id === conversation?._id) {
        setMembers(upd.participants || []);
        setNewName(upd.name || '');
        onConversationUpdated?.(upd);
        if (message) toast.success(message);
      }
    };
    socket.on('member_added', onUpdate);
    socket.on('member_removed', onUpdate);
    socket.on('member_left', onUpdate);
    socket.on('group_updated', onUpdate);
    socket.on('group_dissolved', onUpdate);
    socket.on('removed_from_group', onUpdate);
    socket.on('added_to_group', onUpdate);
    socket.on('promoted_to_admin', onPromoted);
    return () => {
      socket.off('member_added', onUpdate);
      socket.off('member_removed', onUpdate);
      socket.off('member_left', onUpdate);
      socket.off('group_updated', onUpdate);
      socket.off('group_dissolved', onUpdate);
      socket.off('removed_from_group', onUpdate);
      socket.off('added_to_group', onUpdate);
      socket.off('promoted_to_admin', onPromoted);
    };
  }, [socket, conversation?._id]);

  const filteredMembers = members.filter(m => {
    const name = typeof m === 'object' ? (m.username || '') : '';
    return removeAccents(name).toLowerCase().includes(removeAccents(memberSearch).toLowerCase());
  });

  const removableMembers = members.filter((mem) => {
    const u = typeof mem === 'object' ? mem : { _id: mem };
    const uid = u._id?.toString();
    const me = uid === currentUser?._id?.toString();
    const leader = conversation?.admin?._id?.toString() === uid || conversation?.admin?.toString() === uid;
    return !me && !leader;
  });

  const handleRenameGroup = async () => {
    if (!isAdmin || isDissolved) return;
    if (!newName.trim() || newName.trim() === conversation.name) { setEditingName(false); return; }
    setLoading(true);
    try {
      const { data } = await axios.put(`${API_URL}/conversations/${conversation._id}`, { name: newName.trim() });
      toast.success('Đã đổi tên nhóm');
      onConversationUpdated?.(data.data || { ...conversation, name: newName.trim() });
      setEditingName(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Không thể đổi tên'); }
    finally { setLoading(false); }
  };

  const handleRemoveMember = (memberId, memberName) => {
    if (!isAdmin) {
      toast.error('Chỉ trưởng nhóm mới có thể xóa thành viên');
      return;
    }
    setConfirm({
      title: 'Xóa thành viên', message: `Xóa ${memberName} khỏi nhóm?`,
      onConfirm: async () => {
        try {
          const { data } = await axios.delete(`${API_URL}/conversations/${conversation._id}/participants/${memberId}`);
          setMembers(data.data?.participants || []);
          onConversationUpdated?.(data.data || conversation);
          toast.success(`Đã xóa ${memberName}`);
        } catch (err) { toast.error(err.response?.data?.message || 'Không thể xóa'); }
        setConfirm(null);
      },
    });
  };

  const handleLeaveGroup = () => {
    setConfirm({
      title: 'Rời nhóm', message: `Bạn sẽ rời khỏi nhóm "${conversation.name}".`,
      onConfirm: async () => {
        try {
          const { data } = await axios.post(`${API_URL}/conversations/${conversation._id}/leave`);
          toast.success('Đã rời nhóm');
          onGroupLeft?.(data.data || conversation);
        }
        catch (err) { toast.error(err.response?.data?.message || 'Không thể rời nhóm'); }
        setConfirm(null);
      },
    });
  };

  const handleDissolveGroup = () => {
    setConfirm({
      title: 'Giải tán nhóm', requireDouble: true, danger: true,
      message: `Giải tán nhóm "${conversation.name}"? Nhóm sẽ chuyển sang trạng thái chỉ đọc và không ai có thể tiếp tục thao tác.`,
      onConfirm: async () => {
        try {
          const { data } = await axios.delete(`${API_URL}/conversations/${conversation._id}`);
          toast.success('Đã giải tán nhóm');
          onGroupDissolved?.(data.data || conversation);
        } catch (err) { toast.error(err.response?.data?.message || 'Không thể giải tán'); }
        setConfirm(null);
      },
    });
  };

  const handleToggleMemberAddPermission = async () => {
    if (!isAdmin || isDissolved) return;
    setLoading(true);
    try {
      const { data } = await axios.put(`${API_URL}/conversations/${conversation._id}`, {
        permissions: {
          allowMembersAddParticipants: !allowMembersAddParticipants,
        },
      });
      onConversationUpdated?.(data.data || conversation);
      toast.success(!allowMembersAddParticipants ? 'Đã bật quyền thêm thành viên cho thành viên thường' : 'Đã tắt quyền thêm thành viên cho thành viên thường');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật quyền nhóm');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (member) => {
    try { await axios.post(`${API_URL}/friends/request/${member._id}`); toast.success(`Đã gửi lời mời tới ${member.username}`); }
    catch (err) { toast.error(err.response?.data?.message || 'Không thể gửi lời mời'); }
  };

  const handleToggleMute = () => {
    const newVal = !muteNotif;
    onMuteChange?.(conversation?._id, newVal);
    toast(newVal ? '🔕 Đã tắt nhấn mạnh trong danh sách chat. Sidebar vẫn hiện số tin mới.' : '🔔 Đã bật thông báo đầy đủ trong chat');
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden flex-shrink-0">
      <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between bg-white shadow-sm">
        <h2 className="font-bold text-gray-800 text-sm">Thông tin nhóm</h2>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="flex flex-col items-center px-4 py-6 border-b border-gray-100">
          <div className="relative mb-3">
            <GroupAvatarStack participants={members} groupAvatar={conversation?.avatar} size="xl" />
          </div>

          {editingName ? (
            <div className="flex items-center gap-2 w-full px-4">
              <input value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRenameGroup(); if (e.key === 'Escape') setEditingName(false); }}
                maxLength={100} autoFocus
                className="flex-1 text-center text-base font-bold bg-gray-50 border border-blue-300 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-100" />
              <button onClick={handleRenameGroup} disabled={loading} className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"><Check className="w-4 h-4" /></button>
              <button onClick={() => { setEditingName(false); setNewName(conversation.name); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-800 text-lg text-center">{conversation?.name}</p>
              {isAdmin && <button onClick={() => setEditingName(true)} className="text-gray-400 hover:text-gray-600 transition"><Edit3 className="w-4 h-4" /></button>}
            </div>
          )}

          <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
            {isCommunity
              ? <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">🌐 Cộng đồng</span>
              : <span className="text-xs text-gray-500">👥 {memberCount} thành viên</span>
            }
            {isAdmin && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Crown className="w-3 h-3" /> Trưởng nhóm</span>}
          </div>

          {conversation?.createdAt && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
              <Calendar className="w-3.5 h-3.5" />Tạo ngày {formatDate(conversation.createdAt)}
            </div>
          )}

          {(isDissolved || !isCurrentMember) && (
            <div className={`mt-3 w-full rounded-2xl border px-4 py-3 text-center ${
              isDissolved ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
            }`}>
              <p className={`text-sm font-semibold ${
                isDissolved ? 'text-red-600' : 'text-amber-700'
              }`}>
                {isDissolved ? '🚫 Nhóm đã giải tán' : '👁️ Bạn không còn là thành viên nhóm này'}
              </p>
              <p className={`text-xs mt-1 ${
                isDissolved ? 'text-red-500' : 'text-amber-600'
              }`}>
                Bạn vẫn có thể xem lại lịch sử chat nhưng không thể thao tác thêm.
              </p>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className={`grid gap-2 ${canAddMembers && isCurrentMember && !isDissolved ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {canAddMembers && (
              <button onClick={() => setShowAddMember(true)}
                className="flex flex-col items-center gap-1.5 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">Thêm thành viên</span>
              </button>
            )}
            {isCurrentMember && !isDissolved && (
              <button onClick={handleLeaveGroup}
                className="flex flex-col items-center gap-1.5 p-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition">
                <LogOut className="w-5 h-5 text-orange-500" />
                <span className="text-xs font-semibold text-orange-600">Rời nhóm</span>
              </button>
            )}
          </div>
        </div>

        {isAdmin && isCurrentMember && !isDissolved && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Quyền nhóm</p>
            <button
              onClick={handleToggleMemberAddPermission}
              disabled={loading}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                allowMembersAddParticipants ? 'bg-blue-50 hover:bg-blue-100' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <Shield className={`w-4 h-4 ${allowMembersAddParticipants ? 'text-blue-600' : 'text-gray-500'}`} />
              <div className="flex-1 text-left">
                <p className={`text-sm font-medium ${allowMembersAddParticipants ? 'text-blue-700' : 'text-gray-700'}`}>
                  Thành viên thường được thêm người
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Tắt mục này nếu chỉ trưởng nhóm mới được thêm thành viên.
                </p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                allowMembersAddParticipants ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {allowMembersAddParticipants ? 'Đang bật' : 'Đang tắt'}
              </span>
            </button>
          </div>
        )}

        {/* ✅ Cài đặt chat — tắt/bật thông báo group */}
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Cài đặt chat</p>
          <button onClick={handleToggleMute}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${muteNotif ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-gray-50'}`}>
            {muteNotif ? <BellOff className="w-4 h-4 text-orange-500" /> : <Bell className="w-4 h-4 text-gray-500" />}
            <span className={`text-sm flex-1 text-left font-medium ${muteNotif ? 'text-orange-600' : 'text-gray-700'}`}>
              {muteNotif ? 'Bật thông báo' : 'Tắt thông báo trong khung chat'}
            </span>
            {muteNotif && <span className="text-[10px] text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full font-semibold">Đang tắt</span>}
          </button>
          <p className="text-[10px] text-gray-400 px-1 mt-1 leading-snug">
            Sidebar vẫn hiện số tin chưa đọc; chỉ giảm nhấn mạnh trong danh sách chat khi đang tắt.
          </p>
        </div>

        {/* ✅ Members list */}
        <div className="px-4 py-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Thành viên · {memberCount}/{MAX_MEMBERS}</p>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Tìm thành viên..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-300 focus:bg-white transition" />
          </div>

          <div className="space-y-0.5">
            {filteredMembers.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Không tìm thấy</p>}
            {filteredMembers.map((member) => {
              const m = typeof member === 'object' ? member : { _id: member };
              const memberId = m._id?.toString();
              const isMe = memberId === currentUser?._id?.toString();
              const isMemberAdmin = conversation?.admin?._id?.toString() === memberId || conversation?.admin?.toString() === memberId;

              return (
                <div key={memberId} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition group">
                  <Avatar username={m.username || '?'} size="sm" avatarUrl={m.avatar} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-gray-800 truncate">{m.username || 'Người dùng'}</p>
                      {isMemberAdmin && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" title="Trưởng nhóm" />}
                      {isMe && <span className="text-[10px] text-gray-400">(bạn)</span>}
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">{m.email || ''}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    {!isMe && (
                      <button onClick={() => handleAddFriend(m)} title="Kết bạn"
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition">
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Danger zone */}
        {isAdmin && isCurrentMember && !isDissolved && (
          <div className="px-4 py-3 mt-2 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Vùng nguy hiểm</p>
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-xs text-gray-500 hover:text-red-500 transition list-none">
                <div className="flex items-center gap-2"><Shield className="w-4 h-4" /><span>Tuỳ chọn nâng cao</span></div>
                <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
              </summary>
              <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl space-y-3">
                <p className="text-xs text-red-600">⚠️ Hành động bên dưới không thể hoàn tác.</p>
                <div>
                  <p className="text-[11px] font-bold text-red-800 mb-2">Xóa thành viên</p>
                  <p className="text-[10px] text-red-500/90 mb-2">Chỉ trưởng nhóm mới thực hiện được. Không thể xóa trưởng nhóm.</p>
                  {removableMembers.length === 0 ? (
                    <p className="text-[10px] text-gray-500 italic py-1">Không có thành viên nào có thể xóa.</p>
                  ) : (
                    <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                      {removableMembers.map((mem) => {
                        const u = typeof mem === 'object' ? mem : { _id: mem };
                        const uid = u._id?.toString();
                        return (
                          <li key={uid} className="flex items-center gap-2 py-1.5 px-2 bg-white/80 rounded-lg border border-red-100">
                            <Avatar username={u.username || '?'} size="xs" avatarUrl={u.avatar} />
                            <span className="flex-1 text-xs font-medium text-gray-800 truncate">{u.username || 'Người dùng'}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(uid, u.username)}
                              title="Xóa khỏi nhóm"
                              className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition flex-shrink-0"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="pt-2 border-t border-red-200/80">
                  <button type="button" onClick={handleDissolveGroup}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition">
                    <Trash2 className="w-4 h-4" />Giải tán nhóm
                  </button>
                  <p className="text-[10px] text-red-400 text-center mt-1.5">Cần xác nhận 2 lần để giải tán</p>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>

      {showAddMember && (
        <AddMemberModal
          conversation={{ ...conversation, participants: members }}
          onClose={() => setShowAddMember(false)}
          onAdded={(updatedConversation) => {
            if (updatedConversation?.participants) {
              setMembers(updatedConversation.participants);
              onConversationUpdated?.(updatedConversation);
            }
          }}
          currentUser={currentUser}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title} message={confirm.message}
          danger={confirm.danger !== false} requireDouble={confirm.requireDouble}
          onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
