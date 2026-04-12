# 📞 Phân tích Logic Call — Chat App

**Ngày tạo:** 11/04/2026  
**Trạng thái:** Cần sửa lỗi call  
**Tác giả:** AI Analysis

---

## 📋 Mục lục

1. [Tổng quan kiến trúc](#tổng-quan-kiến-trúc)
2. [Flow của cuộc gọi](#flow-của-cuộc-gọi)
3. [Socket Events](#socket-events)
4. [Các vấn đề hiện tại](#các-vấn-đề-hiện-tại)
5. [File cần thêm vào](#file-cần-thêm-vào)
6. [Hướng dẫn fix](#hướng-dẫn-fix)

---

## 🏗️ Tổng quan kiến trúc

### Frontend Call Components
```
client/src/
├── components/
│   └── CallManager.jsx           # Quản lý call UI (modal/inline)
│       - State machine: idle → incoming/outgoing → active → ended
│       - Hỗ trợ 1-1 và group call (nhưng group thường sang CallRoom)
│       - WebRTC peer connection (1:1 hoặc N:N)
│       - Media controls: mic, cam, screen share
│
├── pages/
│   ├── DirectCallRoom.jsx        # Full-screen 1-1 call
│   │   - Layout: fullscreen remote + PiP local
│   │   - Route: /call/:callId?conv=...&type=...&group=0
│   │
│   ├── CallRoom.jsx              # Full-screen group call
│   │   - Layout: Grid hoặc gallery view
│   │   - Route: /call/:callId?conv=...&type=...&group=1
│   │
│   └── Chat.jsx                  # Main chat page
│       - Import CallManager → inline call UI
│
├── hooks/
│   └── useSocket.js              # Socket.io connection hook
│       - Auto reconnect
│       - JWT auth
│       - Emit user_online event
│
└── store/
    └── authStore.js              # Zustand auth state
```

### Backend Call Logic
```
server/src/
├── sockets/
│   ├── index.js                  # Socket.io setup
│   │   - Redis adapter (cho scaling)
│   │   - JWT middleware
│   │
│   ├── callHandler.js            # Call signaling logic
│   │   - activeCalls Map (quản lý call state)
│   │   - disconnectTimers (grace period 15s)
│   │   - Events: call_user, accept_call, reject_call, leave_call, etc
│   │
│   ├── messageHandler.js          # Message events
│   └── presenceHandler.js         # Online/offline status
│
└── ...
```

---

## 🔄 Flow của cuộc gọi

### 1️⃣ Cuộc gọi 1-1 (DirectCallRoom)

#### A. Caller khởi tạo call
```
User A (CallManager)
├─ Click phone/video button
├─ Create: callId (UUID), get User B ID
├─ Call flow:
│  ├─ getLocalStream(mic + cam if video)
│  ├─ Create WebRTC PeerConnection
│  ├─ Create offer
│  ├─ Set localDescription
│  └─ Emit: socket.emit('call_user', {...offer, to: B})
│
├─ Navigate to: /call/:callId?conv=...&type=...&group=0
└─ Show "OutgoingCallScreen" (ringing)
   └─ Auto-cancel nếu timeout 35s (ringTimeout)
```

#### B. Callee nhận incoming call
```
User B (CallManager)
├─ Listen: socket.on('incoming_call', {...offer})
├─ Store: incomingData (caller info)
├─ Show: "IncomingCallScreen" (Accept/Reject)
├─ If Accept:
│  ├─ getLocalStream(mic + cam if video)
│  ├─ Create WebRTC PeerConnection
│  ├─ Set remoteDescription(offer)
│  ├─ Create answer
│  ├─ Set localDescription(answer)
│  ├─ Emit: socket.emit('accept_call', {...answer, to: A})
│  └─ Navigate to: /call/:callId?conv=...&type=...&group=0
│
└─ If Reject:
   └─ Emit: socket.emit('reject_call', {...to: A})
```

#### C. Caller nhận accept
```
Server (callHandler.js):
├─ socket.on('accept_call', {...})
├─ call.startedAt = now
├─ Emit to A: socket.emit('call_accepted', {...answer})
│  └─ A sets remoteDescription(answer)
│
├─ Emit to B: socket.emit('group_call_participant_update')
└─ broadcastCallState(callId)
```

#### D. ICE Candidates trao đổi
```
During call:
├─ RTCPeerConnection.onicecandidate
├─ Emit: socket.emit('ice_candidate', {candidate, to: peer})
│
└─ Listen: socket.on('ice_candidate', {from, candidate})
   └─ pc.addIceCandidate(candidate)
```

#### E. Đặt/Rời call
```
User A:
├─ Toggle Mic: local track control → Emit 'media_state'
├─ Toggle Cam: local track control → Emit 'media_state'
├─ Screen Share: capture desktop → Emit 'media_state'
├─ Hang up: socket.emit('end_call', {to: B, callId, conversationId})
│
└─ Navigation:
   ├─ Leave page → socket.emit('leave_call')
   └─ Close window → Timeout 15s → removeUserFromCall()

Server:
├─ socket.on('end_call')
├─ call.participants.delete(userId)
├─ If participants.size === 0: activeCalls.delete(callId)
└─ Emit: 'call_ended' to other user
```

### 2️⃣ Cuộc gọi Nhóm (CallRoom)

#### A. Caller khởi tạo group call
```
User A (CallManager in group chat)
├─ Click phone/video button
├─ groupTargets = [B, C, D, ...] (all group members except A)
├─ Emit: socket.emit('call_user', {
│   callType: 'audio|video',
│   callId: UUID,
│   conversationId: groupId,
│   isGroup: true,
│   groupTargets: [B, C, D],
│   offer: webrtcOffer
│ })
│
├─ Navigate to: /call/:callId?conv=groupId&type=...&group=1
└─ Show "OutgoingCallScreen" with member status
   └─ Track: pending/joined/rejected
```

#### B. Group members nhận call
```
User B, C, D (CallManager)
├─ Listen: socket.on('incoming_call', {...isGroup: true})
├─ Show: "IncomingCallScreen" (group call)
├─ If Accept:
│  ├─ Emit: accept_call
│  └─ Navigate to: /call/:callId?conv=groupId&type=...&group=1
│
└─ If Reject:
   └─ Emit: reject_call
      └─ Caller UI updates memberStatus[userId] = 'rejected'
```

#### C. Server lưu trữ group call state
```
activeCalls.set(callId, {
  callId,
  conversationId,
  callType: 'audio|video',
  callerId,
  participants: Set([A, B]) // những người join thành công
  pending: Set([C, D]) // những người đang chờ accept
  startedAt: ISOString,
  isGroup: true,
})
```

#### D. Peer-to-peer negotiation (Mesh topology)
```
Khi B join (accept):
├─ B nhận được: call_peers = [A]
├─ B tạo PC connection tới A
├─ B gửi offer tới A
│
├─ A nhận: new_peer_joined {from: B}
├─ A tạo PC connection tới B
├─ A gửi reoffer tới B
│
└─ B nhận reoffer → auto answer (isReoffer = true)
```

---

## 🔌 Socket Events

### Client → Server

| Event | Payload | Mô tả |
|-------|---------|-------|
| `call_user` | `{to, offer, callType, callId, conversationId, isGroup, groupTargets}` | Khởi tạo cuộc gọi |
| `accept_call` | `{to, answer, callId, conversationId}` | Chấp nhận cuộc gọi |
| `reject_call` | `{to, reason, callId, conversationId}` | Từ chối cuộc gọi |
| `end_call` | `{to, callId, conversationId}` | Kết thúc cuộc gọi |
| `leave_call` | `{callId, conversationId}` | Rời khỏi call (không kết thúc) |
| `join_existing_call` | `{callId, conversationId}` | Tham gia call đang diễn ra |
| `rejoin_call` | `{callId, conversationId}` | Quay lại call sau reload |
| `check_active_call` | `{conversationId}` | Kiểm tra call nào đang active |
| `ice_candidate` | `{to, candidate}` | Gửi ICE candidate |
| `media_state` | `{callId, userId, micOn, camOn, screenSharing}` | Cập nhật media state |
| `speaking_state` | `{callId, speaking, lastSpokeAt}` | Phát hiện âm thanh (VAD) |

### Server → Client

| Event | Payload | Mô tả |
|-------|---------|-------|
| `incoming_call` | `{from, fromUser, offer, callType, callId, conversationId, isGroup, isReoffer}` | Có call đến |
| `call_accepted` | `{from, fromUser, answer, callId}` | Call được chấp nhận |
| `call_rejected` | `{from, fromUser, reason, callId}` | Call bị từ chối |
| `call_ended` | `{from, callId}` | Call kết thúc |
| `call_not_found` | `{callId}` | Call không tồn tại |
| `active_call_exists` | `{callId, ...callInfo}` | Có call đang active |
| `active_call_update` | `{callId, ...callInfo}` | Cập nhật call state |
| `active_call_ended` | `{callId, conversationId, reason}` | Call đã kết thúc |
| `new_peer_joined` | `{from, fromUser, callId, conversationId}` | Peer mới join |
| `peer_rejoined` | `{from, fromUser, callId, conversationId}` | Peer quay lại |
| `peer_left_call` | `{from, callId, conversationId, remainingCount, reason}` | Peer rời |
| `call_peers` | `{callId, conversationId, peers, callType, startedAt}` | Danh sách peers |
| `ice_candidate` | `{from, candidate}` | Nhận ICE candidate |
| `group_call_participant_update` | `{callId, conversationId, participantId, status}` | Cập nhật status thành viên |

---

## ⚠️ Các vấn đề hiện tại

### 🔴 **Vấn đề 1: Missing Call Error Context**
**Triệu chứng:** Bạn nói "đang lỗi call" nhưng không rõ lỗi gì  
**Nguyên nhân có thể:**
- WebRTC connection fail (ICE)
- Socket disconnection
- Server state inconsistency
- Browser media permission denied

**Cần kiểm tra:**
- Console browser (DevTools → Console)
- Server logs (`docker-compose logs backend`)
- Network tab (WebSocket events)

---

### 🟡 **Vấn đề 2: Session State Management**
**Vị trí:** `CallManager.jsx` & `CallRoom.jsx`  
**Vấn đề:**
- `callSessionRef` lưu `{isGroup, conversationId}` nhưng có thể mất khi reload
- `persistedCallRef` chỉ lưu từ `sessionStorage` (browser không sync)
- Nếu user reload giữa cuộc gọi:
  - `CallManager` cần gọi `check_active_call` để tìm call đang active
  - `CallRoom` cần gọi `rejoin_call` để quay lại

**Symptom:** User reload → mất call, thay vì quay lại call

---

### 🟡 **Vấn đề 3: ICE Candidate Trao đổi**
**Vị trí:** `CallManager.jsx` & `DirectCallRoom.jsx`  
**Vấn đề:**
- ICE candidates có thể được gửi trước khi `remoteDescription` được set
- Cần buffer candidates trước khi add vào PC

**Code cần check:**
```javascript
// ❌ BAD - addIceCandidate ngay lập tức
socket.on('ice_candidate', ({from, candidate}) => {
  const pc = pcMapRef.current.get(from);
  if (pc) pc.addIceCandidate(candidate); // Có thể fail nếu PC chưa ready
});

// ✅ GOOD - Buffer nếu PC chưa ready
const pendingCandidates = new Map();
socket.on('ice_candidate', ({from, candidate}) => {
  const pc = pcMapRef.current.get(from);
  if (!pc) {
    if (!pendingCandidates.has(from)) pendingCandidates.set(from, []);
    pendingCandidates.get(from).push(candidate);
    return;
  }
  if (pc.remoteDescription?.type) {
    pc.addIceCandidate(candidate).catch(e => console.warn('Add ICE failed:', e));
  } else {
    if (!pendingCandidates.has(from)) pendingCandidates.set(from, []);
    pendingCandidates.get(from).push(candidate);
  }
});

// Khi set remoteDescription:
await pc.setRemoteDescription(offer);
const buffered = pendingCandidates.get(from) || [];
for (const cand of buffered) {
  pc.addIceCandidate(cand).catch(e => console.warn('Add buffered ICE failed:', e));
}
pendingCandidates.delete(from);
```

---

### 🟡 **Vấn đề 4: Media Stream Sync**
**Vị trí:** `CallRoom.jsx` & `Tile.jsx`  
**Vấn đề:**
- Video không hiển thị hoặc bị delay
- `srcObject` cần được set lại khi stream thay đổi
- Cần check `track.readyState === 'live'`

**Code đã fix (BUG2):**
```javascript
// [BUG2 FIX] Gán srcObject khi stream HOẶC camOn thay đổi
useEffect(() => {
  if (!videoRef.current) return;
  const showVideo = (camOn || screenSharing) && stream && stream.getVideoTracks().some(isLive);
  if (showVideo) {
    if (videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
    videoRef.current.play().catch(() => {});
  } else {
    videoRef.current.srcObject = null;
  }
}, [stream, camOn, screenSharing]);
```

---

### 🟡 **Vấn đề 5: Group Call Peer Negotiation**
**Vị trị:** `CallRoom.jsx`  
**Vấn đề:**
- Mesh topology (mỗi peer connect tới mọi peer khác) → N² connections
- Nếu 10 người → 90 connections → heavy
- Cần xử lý 'reoffer' đúng cách

**Server handling (callHandler.js):**
```javascript
// isReoffer = true: người đang trong phòng gửi lại offer tới peer mới
// Client nên auto-answer mà không show UI
if (isReoffer) {
  // Client: listen 'incoming_call' với isReoffer=true
  // → auto answer bằng newPeerOffer
  // → gửi answer về
}
```

---

### 🔴 **Vấn đề 6: Conversation lookup**
**Vị trí:** `callHandler.js` line 211 → `Conversation.findById(conversationId)`  
**Vấn đề:**
- Không import Conversation model!
- Khi nhận reject_call hoặc accept_call → crash

**Fix:**
```javascript
// In callHandler.js, thêm import
import Conversation from '../models/conversation.model.js';
```

---

### 🔴 **Vấn đề 7: Missing Error Boundary & Logging**
**Vị trí:** Toàn bộ Call components  
**Vấn đề:**
- Không có try-catch đủ trong WebRTC operations
- Không log để debug
- User không biết call fail vì gì

**Cần thêm:**
```javascript
try {
  const stream = await navigator.mediaDevices.getUserMedia({...});
} catch (err) {
  if (err.name === 'NotAllowedError') {
    // User từ chối permission
  } else if (err.name === 'NotFoundError') {
    // Không có camera/mic
  }
  // Log error
  console.error('getUserMedia failed:', err);
  // Show user error
  toast.error(`Không thể truy cập: ${err.message}`);
}
```

---

## 📁 File cần thêm vào

### 1. **Logging & Error Tracking**
```
server/src/utils/logger.js
```
- Centralized logging (không chỉ console.log)
- Log call events (ini, accept, reject, end, error)
- Dùng cho debugging

**Content:**
```javascript
export const logCall = (event, data) => {
  console.log(`[CALL:${new Date().toISOString()}] ${event}:`, JSON.stringify(data, null, 2));
};
```

---

### 2. **Call State Persistence**
```
client/src/utils/callStorage.js
```
- Persist call session qua reload
- Lưu: callId, conversationId, isGroup, callType, cam/mic state
- Dùng sessionStorage, không localStorage (session-scoped)

**Content:**
```javascript
const CALL_SESSION_KEY = 'lumi:callSession';

export const saveCallSession = (data) => {
  sessionStorage.setItem(CALL_SESSION_KEY, JSON.stringify(data));
};

export const loadCallSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem(CALL_SESSION_KEY)) || null;
  } catch {
    return null;
  }
};

export const clearCallSession = () => {
  sessionStorage.removeItem(CALL_SESSION_KEY);
};
```

---

### 3. **WebRTC Utilities**
```
client/src/utils/webrtcHelper.js
```
- Helper functions: create PC, set description, add ICE candidate, cleanup
- Centralize WebRTC logic
- Error handling

**Content:**
```javascript
export const createPeerConnection = () => {
  return new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  });
};

export const createOffer = async (pc) => {
  return await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });
};

// ... more helpers
```

---

### 4. **Socket Event Monitor**
```
server/src/utils/socketMonitor.js
```
- Theo dõi số lượng active calls, participants
- Health check endpoint
- Dashboard data

**Content:**
```javascript
export const getCallStats = (activeCalls) => {
  const calls = Array.from(activeCalls.values());
  return {
    totalCalls: calls.length,
    totalParticipants: calls.reduce((sum, c) => sum + c.participants.size, 0),
    groupCalls: calls.filter(c => c.isGroup).length,
    oneToCalls: calls.filter(c => !c.isGroup).length,
  };
};
```

---

### 5. **Test Socket Events**
```
server/src/__tests__/callHandler.test.js
```
- Unit test cho call events
- Test edge cases: timeout, rejection, peer timeout
- Mock socket.io

---

### 6. **Call Error Schema**
```
client/src/utils/callErrors.js
```
- Define call error types
- Error messages in Vietnamese
- Ánh xạ tới UI messages

**Content:**
```javascript
export const CALL_ERRORS = {
  MEDIA_NOT_AVAILABLE: {
    code: 'E001',
    message: 'Không thể truy cập camera/microphone',
    solution: 'Kiểm tra quyền trình duyệt'
  },
  ICE_CONNECTION_FAILED: {
    code: 'E002',
    message: 'Không thể kết nối (ICE error)',
    solution: 'Kiểm tra kết nối Internet'
  },
  // ... more errors
};
```

---

### 7. **Call Configuration**
```
client/src/config/callConfig.js
```
- Centralize call settings
- Timeouts, ICE servers, constraints
- Environment-based config

**Content:**
```javascript
export const CALL_CONFIG = {
  RING_TIMEOUT: 35000,
  ICE_TIMEOUT: 10000,
  GRACE_PERIOD: 15000,
  VIDEO_CONSTRAINTS: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};
```

---

### 8. **Call Analytics**
```
client/src/utils/callAnalytics.js
```
- Track call metrics
- Duration, participants, quality, errors
- Send to backend for analysis

---

## 🔧 Hướng dẫn fix

### Fix 1: Thêm Conversation import vào callHandler.js

```javascript
// server/src/sockets/callHandler.js
// Line 1, thêm:
import Conversation from '../models/conversation.model.js';
```

---

### Fix 2: Add ICE Candidate Buffering

Xem [Vấn đề 3](#vấn-đề-3-ice-candidate-trao-đổi)

---

### Fix 3: Improve Error Handling

```javascript
// Trong CallManager.jsx & CallRoom.jsx
try {
  const stream = await navigator.mediaDevices.getUserMedia({...});
} catch (err) {
  console.error('Media error:', err);
  toast.error(`Media error: ${err.message}`);
  // Fallback: audio only
  return getLocalStream(false);
}
```

---

### Fix 4: Persist Call State pada Reload

Dùng file `callStorage.js` (tìm ở trên)

---

## 📊 Call Event Flow Diagram

```
┌─────────────────────────────┐
│    User A (Caller)          │
├─────────────────────────────┤
│ Click phone button          │
│ → getLocalStream()          │
│ → createPeerConnection()    │
│ → createOffer()             │
│ → setLocalDescription()     │
│ → emit('call_user')         │
│ → Show OutgoingCallScreen   │
└────────────┬────────────────┘
             │ socket emit
             ▼
┌─────────────────────────────┐
│     Server (callHandler)    │
├─────────────────────────────┤
│ socket.on('call_user')      │
│ → activeCalls.set()         │
│ → emit('incoming_call')     │
│   to user B                 │
└────────────┬────────────────┘
             │ socket emit
             ▼
┌─────────────────────────────┐
│    User B (Callee)          │
├─────────────────────────────┤
│ socket.on('incoming_call')  │
│ → Show IncomingCallScreen   │
│ → Click Accept              │
│ → getLocalStream()          │
│ → createPeerConnection()    │
│ → setRemoteDescription()    │
│ → createAnswer()            │
│ → setLocalDescription()     │
│ → emit('accept_call')       │
└────────────┬────────────────┘
             │ socket emit
             ▼
┌─────────────────────────────┐
│     Server (callHandler)    │
├─────────────────────────────┤
│ socket.on('accept_call')    │
│ → call.startedAt = now      │
│ → emit('call_accepted')     │
│   to user A                 │
└────────────┬────────────────┘
             │ socket emit
             ▼
┌─────────────────────────────┐
│    User A (Caller)          │
├─────────────────────────────┤
│ socket.on('call_accepted')  │
│ → setRemoteDescription()    │
│ → Show active call UI       │
│ → Exchange ICE candidates   │
│ → Media streaming starts    │
└─────────────────────────────┘
```

---

## ✅ Checklist để debug call error

- [ ] Kiểm tra browser console (DevTools → Console)
- [ ] Kiểm tra server logs: `docker-compose logs backend`
- [ ] Kiểm tra WebSocket connection (DevTools → Network → WS)
- [ ] Test getUserMedia permission
- [ ] Test ice candidate exchange
- [ ] Verify conversation ID đúng
- [ ] Verify socket auth token hợp lệ
- [ ] Test trên browser khác (Firefox/Chrome)
- [ ] Test với TURN server nếu behind NAT

---

**Document này sẽ được update khi có thêm fix hoặc vấn đề mới.**
