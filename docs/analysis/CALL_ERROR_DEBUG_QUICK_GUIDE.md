# 🔍 Call Error Quick Debug Guide

**Rapid troubleshooting guide cho call lỗi**

---

## 🎯 Xác định vấn đề là gì?

### Triệu chứng: Không thể khởi tạo call

**Bước 1: Kiểm tra console browser**
```
DevTools → Console → Tìm error messages
```

**Bước 2: Kiểm tra server logs**
```bash
docker-compose logs backend -f
# Hoặc
docker logs <backend_container_id> -f
```

**Bước 3: Kiểm tra socket connection**
```
DevTools → Network → WS filter → Click socket.io endpoint
Xem có data exchange không
```

---

## 📱 Các loại lỗi call phổ biến

### 1. **Media Permission Error**

**Triệu chứng:**
- "Camera không được cấp phép"
- "Microphone không khả dụng"
- Không nhìn thấy camera preview

**Debug:**
```javascript
// Browser console
navigator.mediaDevices.getUserMedia({ audio: true, video: true })
  .then(stream => console.log('Media OK:', stream.getTracks()))
  .catch(err => console.error('Media Error:', err.name, err.message));
```

**Fix:**
- Browser Settings → Permissions → Allow camera + mic
- Kiểm tra HTTPS (required for media)
- Thử browser khác (Chrome/Firefox/Edge)

**File hỗ trợ:** `callErrors.js` (MEDIA_PERMISSION_DENIED type)

---

### 2. **ICE Connection Failed**

**Triệu chứng:**
- "Không thể kết nối"
- Call state: waiting/connecting nhưng không connect
- RTCIceConnectionState stuck on "checking"

**Debug:**
```javascript
// Client side
pc.onconnectionstatechange = () => {
  console.log('PC connection state:', pc.connectionState);
};
pc.oniceconnectionstatechange = () => {
  console.log('ICE connection state:', pc.iceConnectionState);
  console.log('ICE gathering state:', pc.iceGatheringState);
};
pc.onicecandidateerror = (event) => {
  console.error('ICE candidate error:', event);
};
```

**Server side:**
```bash
docker-compose logs backend -f | grep -i ice
# Hoặc
docker-compose logs backend -f | grep -i error
```

**Fix:**
- Kiểm tra kết nối Internet (ping 8.8.8.8)
- Firewall/NAT issue → Cần TURN server
- Thêm TURN server vào callConfig.js:
```javascript
export const CALL_CONFIG = {
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'user',
      credential: 'pass'
    }
  ],
};
```

**File hỗ trợ:** `callConfig.js`, `callErrors.js` (ICE_CONNECTION_FAILED)

---

### 3. **Socket Disconnected**

**Triệu chứng:**
- Incoming call không nhận được
- Can't send answer
- "Socket disconnected" error

**Debug:**
```javascript
// Client side (useSocket.js)
socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
  // 'io server disconnect', 'io client disconnect', 'ping timeout', etc
});

// Check socket status
console.log('Socket connected:', socket?.connected);
console.log('Socket ID:', socket?.id);
```

**Server side:**
```bash
# Check if backend is running
docker ps | grep backend_1

# Check logs
docker-compose logs backend -f | grep -i "disconnect\|reconnect"
```

**Fix:**
- Restart backend: `docker-compose restart backend`
- Check `VITE_SOCKET_URL` environment variable
- Verify JWT token is valid
- Check CORS settings in backend

**File hỗ trợ:** `logger.js` (log socket events)

---

### 4. **Offer/Answer Not Being Received**

**Triệu chứng:**
- Caller sees outgoing call screen forever
- Callee doesn't receive incoming call notification
- No error in console

**Debug:**
```javascript
// Client side
// In CallManager.jsx, add logs:
socket.on('incoming_call', (data) => {
  console.log('[CALL DEBUG] incoming_call received:', data);
});

socket.on('call_accepted', (data) => {
  console.log('[CALL DEBUG] call_accepted received:', data);
});

// When emitting
socket.emit('call_user', payload, (ack) => {
  console.log('[CALL DEBUG] call_user ack:', ack);
});
```

**Server side:**
```javascript
// In callHandler.js, add logging:
socket.on('call_user', ({to, offer, callId, conversationId, isGroup, groupTargets}) => {
  console.log('[CALL DEBUG] call_user received', {
    from: socket.userId,
    to, 
    callId,
    hasOffer: !!offer,
    isGroup,
    targetCount: Array.isArray(groupTargets) ? groupTargets.length : 1
  });
  // ... rest of handler
});
```

**Fix:**
- Check if callee is in correct socket room: `user:${calleeId}`
- Verify callId and conversationId are not null/undefined
- Check socket rooms: `socket.rooms`

**File hỗ trợ:** `logger.js`, `socketEmitter.js`

---

### 5. **Media Track Issues**

**Triệu chứng:**
- Audio/video works locally but not remote
- Remote video shows black screen
- Audio one-way

**Debug:**
```javascript
// Client side
// Check local stream
if (localStreamRef.current) {
  console.log('Local stream tracks:');
  localStreamRef.current.getTracks().forEach(track => {
    console.log(`- ${track.kind}: ${track.readyState} (${track.label})`);
  });
}

// Check remote stream
if (remoteStream) {
  console.log('Remote stream tracks:');
  remoteStream.getTracks().forEach(track => {
    console.log(`- ${track.kind}: ${track.readyState}`);
  });
}

// Check if video element has correct srcObject
console.log('Video srcObject === remoteStream?', videoRef.current.srcObject === remoteStream);
console.log('Video paused?', videoRef.current.paused);
```

**Fix:**
- Use webrtcHelper.js: `isTrackLive()` để check track state
- Ensure video element `autoPlay` is set
- Call `.play()` on video element
- Check video constraints in callConfig.js
- Don't set srcObject to null if trying to show fallback avatar

**File hỗ trợ:** `webrtcHelper.js`, `callConfig.js`

---

### 6. **Timeout Issues**

**Triệu chématom:**
- Call auto-cancels sau 35s mặc dù chưa reject
- Timeout removing user từ call

**Debug:**
```javascript
// Client side (CallManager.jsx)
console.log('Ring timeout:', RING_TIMEOUT); // Should be 35000ms
console.log('Call state:', callState);
console.log('Ring countdown:', ringCountdown);
```

**Server side:**
```javascript
// In callHandler.js
const DISCONNECT_GRACE_MS = 15_000;
console.log('Grace period:', DISCONNECT_GRACE_MS);
// Check disconnectTimers Map
console.log('Active timers:', disconnectTimers.size);
```

**Fix:**
- Increase RING_TIMEOUT in callConfig.js if needed
- Ensure socket reconnection works
- Check if user is reconnecting too slowly

**File hỗ trợ:** `callConfig.js`, `logger.js`

---

### 7. **Group Call Not Working**

**Triệu chương:**
- Group call invite sent nhưng callee không thấy
- Only works for 1-1
- Group members not appearing in grid

**Debug:**
```javascript
// Check if group call routing correct
console.log('isGroup:', conversationIsGroup);
console.log('callParticipants:', groupParticipants);

// In CallRoom.jsx
socket.on('call_peers', (data) => {
  console.log('[GROUP DEBUG] receive peers:', data.peers);
});

socket.on('new_peer_joined', (data) => {
  console.log('[GROUP DEBUG] peer joined:', data);
});
```

**Server side:**
```javascript
// Check group targets
socket.on('call_user', ({groupTargets, isGroup}) => {
  console.log('[GROUP DEBUG] groupTargets:', groupTargets);
  console.log('[GROUP DEBUG] isGroup:', isGroup);
});
```

**Fix:**
- Verify route is going to CallRoom, not DirectCallRoom: `?group=1`
- Check groupParticipants contains all members
- Ensure conversation has correct type (group)
- Check if conversation.participants matches groupTargets

**File hỗ trợ:** `CallRoom.jsx`, `logger.js`

---

## 🛠️ Công cụ Debugging

### Browser Console Commands

```javascript
// Check socket connection
socket?.connected                        // true/false
socket?.id                               // socket ID
socket?.rooms                            // Set of rooms joined

// Check WebRTC connections
Object.values(pcMapRef.current).forEach(pc => {
  console.log('PC state:', pc.connectionState);
  console.log('ICE state:', pc.iceConnectionState);
  console.log('Signaling state:', pc.signalingState);
});

// Check media streams
localStreamRef.current?.getTracks()      // Local stream tracks
Object.values(remoteStreams).forEach(s => {
  console.log('Remote tracks:', s.getTracks());
});

// Export call state
console.log(JSON.stringify({
  callState: callStateRef.current,
  callId: callIdRef.current,
  myUserId,
  isGroup: sessionIsGroup,
  remoteStreams: Object.keys(remoteStreams),
}, null, 2));
```

### Server Log Inspection

```bash
# Watch all call events
docker-compose logs backend -f | grep -i "call\|socket"

# Only errors
docker-compose logs backend -f | grep -i "error"

# Only ICE/connection
docker-compose logs backend -f | grep -i "ice\|connection"

# Follow specific container
docker logs -f <container_id>

# Search history
docker-compose logs backend | grep "call_user"
```

### Network Inspection

**DevTools → Network → WS**
1. Filter by `socket.io`
2. Messages tab: see all emits
3. Look for:
   - `call_user` → `incoming_call` flow
   - `accept_call` → `call_accepted` flow
   - `ice_candidate` frequency

---

## 📋 Debugging Checklist

### Pre-Call
- [ ] Browser: Allow camera/mic permissions
- [ ] Network: WiFi/mobileData connected
- [ ] Browser: HTTPS (for media)
- [ ] Socket: Check `socket.connected === true`
- [ ] Auth: Token fresh (< 24h)

### During Outgoing Call
- [ ] Console: No errors
- [ ] Socket: `call_user` emitted
- [ ] Server logs: Event received
- [ ] Remote: Should see `incoming_call` event
- [ ] Timeout: 35s countdown active

### During Incoming Call
- [ ] Console: `incoming_call` received
- [ ] UI: Accept/Reject buttons visible
- [ ] Click Accept: Emit `accept_call`
- [ ] Server: Update `call.startedAt`
- [ ] Other side: Receive `call_accepted`

### During Active Call
- [ ] Local stream: Audio/video tracks active
- [ ] PC connection: `connectionState === 'connected'`
- [ ] ICE: `iceConnectionState !== 'disconnected'`
- [ ] Remote stream: Receiving audio/video
- [ ] Video element: Has srcObject and playing

### When Ending
- [ ] Emit: `end_call` or `leave_call`
- [ ] Server: Update activeCall state
- [ ] Other side: Receive call_ended
- [ ] Cleanup: Streams stopped, PC closed

---

## 🆘 Nếu Vẫn Lỗi

### Step 1: Tập hợp Thông tin
```
- Error message
- Browser + version
- Server logs (tải xuống)
- Network logs (browser export)
- Call IDs involved
- User IDs involved
- Timestamp khi lỗi
- Is it 1-1 or group?
- Is it first call or repeat?
```

### Step 2: Cô lập vấn đề
```
- Test with 2 users on same WiFi
- Test từ browser khác
- Test sau khi clear cache
- Test sau khi restart backend
- Test setup: 1-1 call only first
```

### Step 3: Kiểm tra Infrastructure
```bash
# Backend running?
docker ps | grep backend

# MongoDB running?
docker ps | grep mongo

# Redis running?
docker ps | grep redis

# Network?
ping $(docker inspect backend -f '{{.NetworkSettings.IPAddress}}')

# All services up?
docker-compose ps
```

### Step 4: Enable Debug Mode
```javascript
// callConfig.js
export const LOG_LEVEL = 'debug'; // Instead of 'info'

// socket/index.js
io.engine.on("connection_error", (error) => {
  console.error('Socket.io connection error:', error);
});
```

---

## 📞 File References

| Loại Lỗi | Xem File |
|----------|----------|
| Error messages | `callErrors.js` |
| Media/WebRTC | `webrtcHelper.js` |
| Configuration | `callConfig.js` |
| Server logging | `logger.js` |
| Socket emissions | `socketEmitter.js` |
| Monitoring | `callMonitor.js` |
| Session state | `callStorage.js` |
| Main analysis | `CALL_LOGIC_ANALYSIS.md` |

---

**Last Updated:** 11/04/2026  
**Version:** 1.0  
**For:** AI Quick Debugging
