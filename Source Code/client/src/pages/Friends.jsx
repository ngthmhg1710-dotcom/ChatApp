import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { UserX, Check, X, MessageCircle, Users, Clock, UserPlus } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function Avatar({ username = '', size = 'md', onClick }) {
  const initials = username.slice(0, 2).toUpperCase();
  const COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-pink-500','bg-amber-500','bg-cyan-500','bg-rose-500'];
  const color = COLORS[(username.charCodeAt(0) || 0) % COLORS.length];
  const sz = { sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-14 h-14 text-base' }[size] || 'w-11 h-11 text-sm';
  return (
    <div onClick={onClick}
      className={`${sz} ${color} rounded-full flex items-center justify-center font-bold text-white select-none flex-shrink-0
        ${onClick ? 'cursor-pointer hover:opacity-80 transition ring-2 ring-white hover:ring-blue-200' : ''}`}>
      {initials}
    </div>
  );
}

// Profile modal khi click vào bạn bè
function FriendProfileModal({ friend, onClose, onUnfriend }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const COLORS = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-pink-500','bg-amber-500','bg-cyan-500','bg-rose-500'];
  const color = COLORS[(friend?.username?.charCodeAt(0) || 0) % COLORS.length];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="bg-white rounded-3xl shadow-2xl w-80 overflow-hidden">
        {/* Banner */}
        <div className={`h-20 ${color} opacity-30`} />
        {/* Avatar overlap */}
        <div className="px-6 -mt-9 flex items-end justify-between">
          <div className={`w-16 h-16 ${color} rounded-full flex items-center justify-center font-bold text-white text-xl ring-4 ring-white shadow-lg`}>
            {friend?.username?.slice(0, 2).toUpperCase()}
          </div>
          <button onClick={onClose} className="mb-1 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info */}
        <div className="px-6 pb-6 pt-3">
          <p className="font-bold text-gray-900 text-lg">{friend?.username}</p>
          <p className="text-sm text-gray-400 mt-0.5">{friend?.email}</p>
          {friend?.bio && (
            <p className="text-sm text-gray-600 mt-2 leading-relaxed bg-gray-50 rounded-xl px-3 py-2">
              {friend.bio}
            </p>
          )}

          {/* Online status */}
          <div className="flex items-center gap-2 mt-3">
            <span className={`w-2.5 h-2.5 rounded-full ${friend?.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-sm text-gray-500">
              {friend?.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
            </span>
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={() => { toast('Mở chat với ' + friend?.username); onClose(); }}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> Nhắn tin
            </button>
            <button
              onClick={() => { onUnfriend(friend._id); onClose(); }}
              className="w-full py-2.5 bg-red-50 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-2">
              <UserX className="w-4 h-4" /> Xóa bạn bè
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Friends() {
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const [friends, setFriends]   = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'friends'
  const [selectedFriend, setSelectedFriend] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  // FIX: Lắng nghe socket để nhận lời mời kết bạn real-time
  useEffect(() => {
    if (!socket) return;

    const onFriendRequest = (data) => {
      // data.from = thông tin người gửi
      setRequests(prev => {
        // Tránh duplicate
        const exists = prev.some(r => r.from?._id === data.from?._id || r.from === data.from?._id);
        if (exists) return prev;
        return [...prev, {
          _id: `temp-${Date.now()}`,
          from: data.from,
          createdAt: new Date().toISOString(),
        }];
      });
      toast(`${data.from?.username || 'Ai đó'} đã gửi lời mời kết bạn! 👋`, { icon: '🤝' });
      // Refresh để lấy _id thật
      setTimeout(fetchRequests, 500);
    };

    const onFriendAccepted = (data) => {
      toast.success(`${data.user?.username || 'Ai đó'} đã chấp nhận lời mời kết bạn! 🎉`);
      fetchFriends();
    };

    socket.on('friend_request_received', onFriendRequest);
    socket.on('friend_request_accepted', onFriendAccepted);

    return () => {
      socket.off('friend_request_received', onFriendRequest);
      socket.off('friend_request_accepted', onFriendAccepted);
    };
  }, [socket]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchFriends(), fetchRequests()]);
    setLoading(false);
  };

  const fetchFriends = async () => {
    try {
      const res = await axios.get(`${API_URL}/friends`);
      setFriends(res.data.data || []);
    } catch { toast.error('Không thể tải danh sách bạn bè'); }
  };

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/friends/requests`);
      setRequests(res.data.data || []);
    } catch { toast.error('Không thể tải lời mời kết bạn'); }
  };

  const accept = async (id) => {
    try {
      await axios.post(`${API_URL}/friends/accept/${id}`);
      toast.success('Đã chấp nhận lời mời kết bạn!');
      fetchFriends();
      fetchRequests();
    } catch { toast.error('Không thể chấp nhận'); }
  };

  const reject = async (id) => {
    try {
      await axios.post(`${API_URL}/friends/reject/${id}`);
      toast('Đã từ chối lời mời');
      setRequests(prev => prev.filter(r => r._id !== id));
    } catch { toast.error('Không thể từ chối'); }
  };

  const unfriend = async (friendId) => {
    try {
      await axios.delete(`${API_URL}/friends/${friendId}`);
      toast.success('Đã xóa bạn bè');
      setFriends(prev => prev.filter(f => f._id !== friendId));
    } catch { toast.error('Không thể xóa bạn bè'); }
  };

  const formatTime = (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    return `${Math.floor(diff / 86400000)} ngày trước`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Bạn bè</h1>
        <p className="text-sm text-gray-400 mt-0.5">Quản lý bạn bè và lời mời kết bạn</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition
            ${activeTab === 'requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Clock className="w-4 h-4" />
          Lời mời
          {requests.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {requests.length > 9 ? '9+' : requests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition
            ${activeTab === 'friends' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Users className="w-4 h-4" />
          Bạn bè
          <span className="text-xs text-gray-400">({friends.length})</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">

        {/* Tab: Lời mời kết bạn */}
        {activeTab === 'requests' && (
          <div>
            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <UserPlus className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-medium text-gray-500">Không có lời mời nào</p>
                <p className="text-sm mt-1">Khi có người gửi lời mời, bạn sẽ thấy ở đây</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">
                  {requests.length} lời mời đang chờ
                </p>
                {requests.map((req) => (
                  <div key={req._id}
                    className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition border border-gray-100">
                    <Avatar username={req.from?.username || '?'} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {req.from?.username || 'Người dùng'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{req.from?.email}</p>
                      <p className="text-xs text-gray-300 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(req.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => accept(req._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-xl hover:bg-green-600 transition shadow-sm">
                        <Check className="w-3.5 h-3.5" /> Chấp nhận
                      </button>
                      <button
                        onClick={() => reject(req._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-200 transition">
                        <X className="w-3.5 h-3.5" /> Từ chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Danh sách bạn bè */}
        {activeTab === 'friends' && (
          <div>
            {friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Users className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-medium text-gray-500">Chưa có bạn bè nào</p>
                <p className="text-sm mt-1">Tìm kiếm và thêm bạn bè mới</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">
                  {friends.length} bạn bè
                </p>
                {friends.map((friend) => (
                  <div key={friend._id}
                    className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm hover:shadow-md transition border border-gray-100 group">
                    {/* FIX: Click avatar mở profile modal */}
                    <div className="relative flex-shrink-0">
                      <Avatar
                        username={friend.username || '?'}
                        size="md"
                        onClick={() => setSelectedFriend(friend)}
                      />
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white
                        ${friend.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{friend.username}</p>
                      <p className="text-xs text-gray-400 truncate">{friend.email}</p>
                      {friend.bio && (
                        <p className="text-xs text-gray-400 truncate mt-0.5 italic">"{friend.bio}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${friend.isOnline ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {friend.isOnline ? 'Online' : 'Offline'}
                      </span>
                      <button
                        onClick={() => toast('Mở chat với ' + friend.username)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Nhắn tin">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => unfriend(friend._id)}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition" title="Xóa bạn">
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {selectedFriend && (
        <FriendProfileModal
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
          onUnfriend={unfriend}
        />
      )}
    </div>
  );
}
