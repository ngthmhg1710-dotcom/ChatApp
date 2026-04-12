# 📝 File Analysis Summary

**Tạo ngày:** 11/04/2026  
**Phiên bản:** 1.0  
**Trạng thái:** Hoàn chỉnh - Sẵn sàng cho AI debugging

---

## 🎯 Giới thiệu

Sau khi đọc toàn bộ code call của dự án, tôi đã:

1. ✅ **Phân tích chi tiết** logic call 1-1 và group
2. ✅ **Xác định 7 vấn đề** hiện tại (bug, architecture)
3. ✅ **Tạo 5 file tài liệu chính**
4. ✅ **Tạo 6 file utility hỗ trợ**

---

## 📚 File Tài Liệu Chính

### 1. **CALL_LOGIC_ANALYSIS.md** ⭐ (File chính)
**Vị trí:** `c:\Users\MSI\tét\chat-app\CALL_LOGIC_ANALYSIS.md`

**Nội dung:**
- 📊 Tổng quan kiến trúc call
- 🔄 Flow chi tiết 1-1 và group call
- 🔌 Tất cả socket events (request/response)
- ⚠️ 7 vấn đề hiện tại có chi tiết fix
- 📁 Danh sách file cần thêm
- 🔧 Hướng dẫn fix toàn bộ

**Cấu trúc:**
```
├─ Tổng quan kiến trúc
├─ Flow của cuộc gọi (1-1 & group)
├─ Socket Events (bảng đầy đủ)
├─ Các vấn đề hiện tại (7 bug)
├─ File cần thêm vào
├─ Hướng dẫn fix
└─ Checklist debug
```

**Lợi ích:**
- AI sẽ hiểu toàn bộ call flow
- Biết được các bug cần fix
- Có hướng dẫn fix chi tiết
- Có event reference lengkap

---

## 🛠️ File Utility Được Tạo

### Frontend Utilities

#### 2. **client/src/utils/callStorage.js**
```javascript
✓ saveCallSession(data)          // Lưu state call vào sessionStorage
✓ loadCallSession()              // Đọc lại call session (khi reload)
✓ clearCallSession()             // Xóa call session
✓ getActiveCallSession()         // Get current active session
```

**Dùng cho:** FIX [Vấn đề 2](#vấn-đề-2-session-state-management) - Persist call state qua reload

---

#### 3. **client/src/utils/webrtcHelper.js**
```javascript
✓ createPeerConnection()         // Tạo RTCPeerConnection
✓ createOffer()                  // Tạo offer
✓ createAnswer()                 // Tạo answer
✓ setLocalDescription()          // Set local description
✓ setRemoteDescription()         // Set remote description
✓ addICECandidate()              // Add ICE candidate (with buffer check)
✓ getUserMedia()                 // Get camera/mic stream
✓ getScreenCapture()             // Get screen share
✓ isTrackLive()                  // Check if track is active
✓ stopMediaStream()              // Stop all tracks
✓ closePeerConnection()          // Clean up PC
✓ replaceStreamTracks()          // Replace tracks while call active
✓ getPeerConnectionStats()       // Get call quality stats
✓ mapMediaError()                // Map errors to Vietnamese
```

**Dùng cho:** FIX [Vấn đề 3](#vấn-đề-3-ice-candidate-trao-đổi) & [Vấn đề 4](#vấn-đề-4-media-stream-sync) - Centralize WebRTC + fix ICE buffering

---

#### 4. **client/src/config/callConfig.js**
```javascript
✓ RING_TIMEOUT                   // 35 giây
✓ GRACE_PERIOD                   // 15 giây timeout
✓ ICE_TIMEOUT                    // 10 giây
✓ AUDIO_CONSTRAINTS              // Mic constraints
✓ VIDEO_CONSTRAINTS              // Camera constraints
✓ SCREEN_CONSTRAINTS             // Screen share constraints
✓ ICE_SERVERS                    // STUN/TURN servers
✓ VAD settings                   // Voice Activity Detection thresholds
✓ GROUP_CALL settings            // Max peers, topology
✓ CALL_STATES enum               // idle, ringing, connecting, active...
✓ MEMBER_STATUS enum             // pending, joined, rejected, left...
```

**Dùng cho:** Configuration centralized, easy update sau này

---

#### 5. **client/src/utils/callErrors.js**
```javascript
✓ CALL_ERROR_TYPES enum          // 20+ error types
✓ CALL_ERRORS object             // Each error: title, message, hint, severity
✓ getCallError()                 // Get error info
✓ mapMediaErrorToBrowserError()  // Map browser DOMException → call error
✓ mapScreenErrorToCallError()    // Map screen share error
```

**Errors included:**
- Media: no device, permission denied, not readable, overconstrained, generic
- Screen: permission denied, not found, generic
- WebRTC: PC creation, ICE connection, offer/answer, description
- Network: socket disconnected, auth failed, unreachable
- Call: not found, already ended, peer timeout, callee rejected

**Dùng cho:** FIX [Vấn đề 7](#vấn-đề-7-missing-error-boundary--logging) - User-friendly error messages

---

### Server Utilities

#### 6. **server/src/utils/logger.js**
```javascript
✓ logCallEvent.debug()           // Debug logs
✓ logCallEvent.info()            // Info logs
✓ logCallEvent.warn()            // Warning logs
✓ logCallEvent.error()           // Error logs

✓ logCallInit()                  // Call initiated
✓ logCallAccepted()              // Call accepted
✓ logCallRejected()              // Call rejected
✓ logCallEnded()                 // Call ended
✓ logPeerJoined()                // Peer joined
✓ logPeerLeft()                  // Peer left
✓ logICECandidate()              // ICE exchange
✓ logMediaState()                // Media state change
✓ logSpeakingState()             // Speaking/mute
✓ logError()                     // Call error
✓ logConnectionTimeout()         // Connection timeout
✓ logStats()                     // Call statistics
```

**Features:**
- Colored output (DEBUG, INFO, WARN, ERROR)
- Automatic timestamps
- JSON formatting
- LOG_LEVEL environment variable

**Dùng cho:** Debugging call issues (check server logs)

---

#### 7. **server/src/utils/callMonitor.js**
```javascript
class CallMonitor {
  ✓ registerCall()                // Register new call
  ✓ unregisterCall()              // Unregister call
  ✓ getCall()                     // Get call info
  ✓ recordIceCandidate()          // Record ICE stats
  ✓ recordMediaStateUpdate()      // Record media updates
  ✓ recordError()                 // Record errors
  ✓ getStats()                    // Get overall stats
  ✓ getCallsByUser()              // Get user's calls
  ✓ getHealthCheck()              // Health check
  ✓ cleanup()                     // Clean old calls
  ✓ export()                      // Export for monitoring
}
```

**Tracks:**
- Active calls count
- Participants per call
- ICE candidates exchanged
- Media state updates
- Errors occurred
- Call duration
- Group vs 1-1 split

**Dùng cho:** Monitoring, debugging, finding call bottlenecks

---

#### 8. **server/src/utils/socketEmitter.js**
```javascript
class SocketEmitter {
  ✓ emitToUser()                  // Emit to specific user
  ✓ emitToConversation()          // Emit to conversation room
  ✓ emitToPeer()                  // Emit peer-to-peer
  ✓ broadcastToCallParticipants() // Emit to all in call
  ✓ emitCallUser()                // incoming_call event
  ✓ emitCallAccepted()            // call_accepted event
  ✓ emitCallRejected()            // call_rejected event
  ✓ emitCallEnded()               // call_ended event
  ✓ emitIceCandidate()            // ice_candidate event
  ✓ emitNewPeerJoined()          // new_peer_joined event
  ✓ emitPeerLeft()                // peer_left_call event
  ✓ emitMediaState()              // media_state event
  ✓ emitSpeakingState()           // speaking_state event
  ✓ emitError()                   // error event
  ✓ emitToSocket()                // Direct socket emit
}
```

**Benefits:**
- Centralized emission logic
- Error handling
- Logging on every emit
- Type-safe event names

**Dùng cho:** Simplify callHandler.js, add logging to every event

---

## 🔗 File Liên Quan (Đã Được Phân Tích)

### Frontend Call Components
```
client/src/
├── components/
│   └── CallManager.jsx           ⭐ Main 1-1 call component
│       ├─ State machine
│       ├─ WebRTC peer connection
│       ├─ Media controls
│       └─ Session persistence
│
├── pages/
│   ├── DirectCallRoom.jsx        ⭐ Full-screen 1-1 call
│   │   ├─ Fullscreen layout
│   │   ├─ Incoming/Outgoing screens
│   │   └─ WebRTC negotiation
│   │
│   ├── CallRoom.jsx              ⭐ Full-screen group call
│   │   ├─ Grid/gallery layout
│   │   ├─ Incoming call overlay
│   │   └─ Mesh topology P2P
│   │
│   ├── Chat.jsx                  ⭐ Main chat page
│   │   └─ Imports CallManager
│   │
│   ├── Login.jsx
│   ├── Register.jsx
│   └── ... (other pages)
│
├── hooks/
│   └── useSocket.js              ⭐ Socket.io hook
│       ├─ Auto reconnect
│       ├─ JWT auth
│       └─ user_online event
│
└── store/
    └── authStore.js              ⭐ Zustand auth
```

### Backend Call Logic
```
server/src/
├── sockets/
│   ├── index.js                  ⭐ Socket.io setup
│   │   ├─ Redis adapter
│   │   └─ JWT middleware
│   │
│   ├── callHandler.js            ⭐⭐ MAIN SIGNALING
│   │   ├─ activeCalls Map
│   │   ├─ Grace period timers
│   │   └─ All call events
│   │
│   ├── messageHandler.js
│   └── presenceHandler.js
│
├── controllers/
│   ├── user.controller.js
│   ├── conversation.controller.js
│   └── ... (other controllers)
│
├── models/
│   ├── user.model.js
│   ├── conversation.model.js
│   └── message.model.js
│
├── routes/
├── middlewares/
├── config/
│   ├── database.js
│   ├── redis.js
│   └── email.js
│
├── utils/                         🆕 NEW UTILITIES
│   ├── logger.js                 🆕
│   ├── callMonitor.js            🆕
│   └── socketEmitter.js          🆕
│
├── app.js                        ⭐ Express app
└── server.js                     ⭐ Entry point
```

---

## 🐛 Vấn Đề & Fix Mapping

| Vấn đề | File Liên Quan | Fix | File Hỗ Trợ |
|-------|-----------------|-----|-------------|
| #1: Missing error context | CallManager, CallRoom | Add try-catch + logging | callErrors.js, logger.js |
| #2: Session state loss on reload | CallManager, CallRoom | Persist to sessionStorage | callStorage.js |
| #3: ICE candidate buffering | CallManager, DirectCallRoom | Buffer before adding | webrtcHelper.js |
| #4: Media stream sync | CallRoom, Tile | Check track.readyState | webrtcHelper.js |
| #5: Group peer negotiation | CallRoom | Handle reoffer correctly | callConfig.js |
| #6: Missing Conversation import | callHandler.js | Add import statement | (inline) |
| #7: No error handling | All call components | Wrap in try-catch | callErrors.js, logger.js |

---

## ✅ Cách Sử Dụng File Mới

### Frontend Usage

```javascript
// Import and use storage
import { saveCallSession, loadCallSession } from '@/utils/callStorage';

// In CallManager.jsx
const activeSession = loadCallSession();
if (activeSession?.callId) {
  // Rejoin call
}

// Save state before navigate/unload
saveCallSession({
  callId: currentCallId,
  conversationId: convId,
  isGroup: !!isGroup,
  callType: callType,
  micOn: micState,
  camOn: camState,
  screenShare: screenShareState,
});
```

```javascript
// Import WebRTC helpers
import * as WebRTC from '@/utils/webrtcHelper';
import { CALL_CONFIG } from '@/config/callConfig';

// Create PC with error handling
try {
  const pc = WebRTC.createPeerConnection();
  const offer = await WebRTC.createOffer(pc);
  await WebRTC.setLocalDescription(pc, offer);
} catch (err) {
  const error = CALL_ERRORS[mapMediaErrorToBrowserError(err)];
  toast.error(error.message);
}
```

```javascript
// Map errors to user messages
import { getCallError, mapMediaErrorToBrowserError } from '@/utils/callErrors';

try {
  const stream = await navigator.mediaDevices.getUserMedia({...});
} catch (err) {
  const errorType = mapMediaErrorToBrowserError(err);
  const errorInfo = getCallError(errorType);
  showErrorDialog(errorInfo);
}
```

### Server Usage

```javascript
// In callHandler.js
import { logCallEvent } from '../utils/logger.js';
import { getCallMonitor } from '../utils/callMonitor.js';
import { getSocketEmitter } from '../utils/socketEmitter.js';

const monitor = getCallMonitor();
const emitter = getSocketEmitter();

// Use instead of this.io.to().emit()
emitter.emitCallUser(targetUserId, { from, offer, ... });

// Log events
logCallEvent.info('CALL_INIT', 'New call', { callId, from, to });

// Track statistics
monitor.registerCall(callId, callData);
monitor.recordIceCandidate(callId);
```

```javascript
// Get health check  
const health = getCallMonitor().getHealthCheck();
// {
//   status: 'active',
//   calls: { active: 5, participants: 12, groupCalls: 2, oneToOne: 3 },
//   uptime: 3600000,
//   ...
// }
```

---

## 📊 Files Created Summary Table

| File | Type | Lines | Purpose | Status |
|------|------|-------|---------|--------|
| CALL_LOGIC_ANALYSIS.md | Doc | 800+ | Comprehensive call analysis | ✅ Complete |
| callStorage.js | Utility (FE) | 60 | Session persistence | ✅ Created |
| webrtcHelper.js | Utility (FE) | 350+ | WebRTC operations | ✅ Created |
| callConfig.js | Config (FE) | 100+ | Call settings | ✅ Created |
| callErrors.js | Utility (FE) | 250+ | Error mapping | ✅ Created |
| logger.js | Utility (BE) | 150+ | Call event logging | ✅ Created |
| callMonitor.js | Utility (BE) | 200+ | Call statistics | ✅ Created |
| socketEmitter.js | Utility (BE) | 150+ | Centralized emissions | ✅ Created |

**Total:** 8 files, 2000+ lines of code/doc

---

## 🚀 Next Steps

### Immediate Fixes (Priority 1)
```
1. Add Conversation import to callHandler.js (FIX #6)
2. Implement ICE candidate buffering (FIX #3)  
3. Add error handling + fallback (FIX #7)
4. Integrate logger + monitor to callHandler.js
```

### Short-term (Priority 2)
```
5. Implement session persistence (FIX #2)
6. Add try-catch to media operations (FIX #1)
7. Test peer negotiation flow (FIX #5)
```

### Medium-term (Priority 3)
```
8. Add TURN server for NAT traversal
9. Implement call analytics dashboard
10. Add performance monitoring
```

---

## 📖 How to Use This Summary

1. **When fixing bugs:** Refer to CALL_LOGIC_ANALYSIS.md for detailed issue descriptions
2. **When implementing features:** Use utility files (webrtcHelper, logger, etc.)
3. **When debugging:** Check server logs with logger, monitor stats with callMonitor
4. **When adding error handling:** Map errors using callErrors.js
5. **When refactoring:** Use centralized configs (callConfig.js)

---

**Document này cập nhật lần cuối:** 11/04/2026  
**Ready for AI fixes:** ✅ Yes - All context provided
