# 📂 Cấu trúc Dự án Chi tiết - Chat Application

> **Cập nhật**: Phiên bản đầy đủ với chú thích chi tiết cho từng file
> **Công nghệ**: React 18 + Vite (Frontend) | NodeJS + Express + Socket.io (Backend) | MongoDB + Redis | Docker
> **Tổng quan**: Ứng dụng chat real-time với gọi video/audio, hỗ trợ nhóm, file sharing, và scalability

---

## 🎯 Tổng quan Kiến trúc

Dự án được chia thành 3 phần chính:
1. **Backend** (NodeJS + Express + Socket.io) - API server và real-time communication
2. **Frontend** (React + Vite + TailwindCSS) - Single Page Application
3. **Infrastructure** (Docker + Nginx + MongoDB + Redis) - Containerization và scaling

---

## 📁 Chi tiết Cấu trúc Thư mục

```
chat-app/
│
├── 📄 docker-compose.yml          # Orchestration - định nghĩa 5 services: MongoDB, Redis, Backend, Frontend, Nginx
│                                  # Ports: 27017(MongoDB), 6379(Redis), 5000(Backend), 3000(Frontend), 80/443(Nginx)
│
├── 📄 README.md                   # Documentation chính - hướng dẫn cài đặt, tính năng, API endpoints
│
├── 📄 package.json                # Root package (chứa nodemailer dependency - có thể xóa nếu không dùng)
│
├── 📄 .gitignore                  # Git ignore rules - loại trừ node_modules, .env, uploads, dist, .DS_Store...
│
├── 📄 App.jsx                     # Root App component (có thể là file thừa, App chính ở client/src/)
│
├── 📂 server/                     # BACKEND - NodeJS + Express API Server (Port 5000)
│   ├── 📂 src/
│   │   ├── 📂 config/             # Cấu hình kết nối và services
│   │   │   ├── database.js        # MongoDB connection với Mongoose, retry logic, error handling
│   │   │   ├── redis.js           # Redis client setup, cache helpers (cacheSet, cacheGet, cacheDel), connection pooling
│   │   │   └── email.js           # Nodemailer config cho email verification, reset password, SMTP settings
│   │   │
│   │   ├── 📂 models/             # Mongoose Schemas - định nghĩa cấu trúc database collections
│   │   │   ├── user.model.js      # User schema: username, email, password(hashed), avatar, bio, gender, role(user/moderator/admin),
│   │   │   │                       # isVerified, verificationToken, resetPasswordToken, friends[], friendRequests[], blockedUsers[],
│   │   │   │                       # isOnline, lastSeen, timestamps... Methods: comparePassword, getResetPasswordToken
│   │   │   │
│   │   │   ├── conversation.model.js  # Conversation schema: type(private/group/community), name, isGroup, participants[],
│   │   │   │   │                       # formerParticipants[], admin, permissions, avatar, lastMessage(ref), pinnedMessages[],
│   │   │   │   │                       # dissolvedAt, dissolvedBy, historyVisibleUntil, timestamps...
│   │   │   │   │                       # Static methods: findPrivateConversation, createOrGetPrivate
│   │   │   │
│   │   │   ├── message.model.js   # Message schema: conversation(ref), sender(ref), type(text/image/file/video/audio/system),
│   │   │   │   │                   # content, fileUrl, fileName, fileSize, metadata, replyTo(ref), readBy[], deletedFor[],
│   │   │   │   │                   # isEdited, editHistory[], reactions(Map: emoji -> userIds[]), timestamps...
│   │   │   │   │                   # Methods: markAsRead, virtual: isRead
│   │   │   │
│   │   │   └── report.model.js    # Report schema: reportedBy(ref), reportedUser(ref), reason, description, status(pending/approved/rejected),
│   │   │       │                   # reviewedBy(ref), reviewedAt, timestamps...
│   │   │
│   │   ├── 📂 routes/             # API Route definitions - mapping URLs to controllers
│   │   │   ├── auth.route.js      # /api/auth/* : POST register, POST login, POST logout, GET me, PUT profile, PUT change-password,
│   │   │   │                       # POST forgot-password, POST reset-password
│   │   │   │
│   │   │   ├── user.route.js      # /api/users/* : GET /search?q=, GET /:id, PUT /:id, PUT /avatar (multer), GET /block/:id, DELETE /block/:id
│   │   │   │
│   │   │   ├── friend.route.js    # /api/friends/* : POST /request/:userId, POST /accept/:requestId, POST /reject/:requestId,
│   │   │   │                       # DELETE /request/:userId, DELETE /:userId, GET / (list), GET /requests
│   │   │   │
│   │   │   ├── conversation.route.js  # /api/conversations/* : POST / (create 1-1), POST /group (create group), GET / (list),
│   │   │   │   │                       # GET /:id, PUT /:id, DELETE /:id, POST /:id/participants, DELETE /:id/participants/:userId
│   │   │   │   │
│   │   │   ├── message.route.js   # /api/messages/* : GET /:conversationId (paginated), POST /upload (multer), GET /search?q=,
│   │   │   │   │                   # PUT /:id/read, DELETE /:id, PUT /:id
│   │   │   │
│   │   │   └── report.route.js    # /api/reports/* : POST / (create), GET / (admin only), PUT /:id/status (admin only)
│   │   │
│   │   ├── 📂 controllers/        # Business Logic - xử lý yêu cầu từ routes
│   │   │   ├── auth.controller.js      # register (send email verify), login (JWT generation), logout, getProfile, updateProfile,
│   │   │   │                           # changePassword (verify old), forgotPassword (send reset email), resetPassword (verify token)
│   │   │   │
│   │   │   ├── user.controller.js      # searchUsers (by username/email with regex), getUserProfile, updateUserProfile,
│   │   │   │                           # uploadAvatar (multer + save URL), blockUser, unblockUser
│   │   │   │
│   │   │   ├── friend.controller.js    # sendFriendRequest (check duplicates), acceptFriendRequest (add to friends[]),
│   │   │   │                           # rejectFriendRequest, cancelFriendRequest, removeFriend, getFriendList, getFriendRequests
│   │   │   │
│   │   │   ├── conversation.controller.js  # createConversation (find or create 1-1), createGroupConversation,
│   │   │   │   │                           # getUserConversations (with lastMessage populate), getConversation,
│   │   │   │   │                           # updateConversation, deleteConversation, addParticipants, removeParticipants,
│   │   │   │   │                           # leaveConversation
│   │   │   │
│   │   │   ├── message.controller.js   # getMessages (pagination with createdAt sort), uploadFile (multer config for images/docs),
│   │   │   │                           # searchMessages (regex on content), markMessagesAsRead (bulk update readBy),
│   │   │   │                           # deleteMessage (soft delete: add to deletedFor[]), updateMessage (edit with history)
│   │   │   │
│   │   │   └── report.controller.js    # createReport (user submits), getReports (admin, with filters),
│   │   │       │                       # updateReportStatus (approve/reject/pending, notify user)
│   │   │
│   │   ├── 📂 middlewares/        # Express Middlewares - xử lý trước khi vào controller
│   │   │   ├── auth.middleware.js # JWT verification (extract from Authorization header),
│   │   │   │                       # attach decoded user to req.user, optional: role check
│   │   │   │
│   │   │   └── error.middleware.js # (nếu có) Global error handler, format error responses
│   │   │
│   │   ├── 📂 sockets/            # Socket.io Event Handlers - real-time bidirectional communication
│   │   │   ├── index.js           # Socket.io initialization, Redis Adapter setup (pub/sub clients),
│   │   │   │                       # JWT authentication middleware (io.use), connection handler,
│   │   │   │                       # setup handlers (presence, message, call), helper functions (getIO, emitToUser, emitToRoom)
│   │   │   │
│   │   │   ├── messageHandler.js  # Handle events: 'send_message' (save + broadcast), 'edit_message',
│   │   │   │                       # 'delete_message', 'mark_read', 'typing' (broadcast typing status),
│   │   │   │                       # 'stop_typing'
│   │   │   │
│   │   │   ├── presenceHandler.js # Handle events: 'user_online' (update isOnline, lastSeen),
│   │   │   │                       # 'user_offline', 'get_online_users' (emit online_users_list),
│   │   │   │                       # broadcast presence changes to friends
│   │   │   │
│   │   │   └── callHandler.js     # WebRTC signaling: 'call_offer' (initiate call), 'call_answer',
│   │   │       │                   # 'ice_candidate' (exchange media info), 'call_reject', 'call_end',
│   │   │       │                   # 'call_timeout'
│   │   │
│   │   ├── 📂 utils/              # Utility functions
│   │   │   ├── logger.js          # Console logger with timestamp, levels (info, warn, error), colors
│   │   │   ├── socketEmitter.js   # Helper functions: emitToUser(userId, event, data),
│   │   │   │                       # emitToRoom(roomId, event, data), forceUserLeaveConversation
│   │   │   │
│   │   │   └── callMonitor.js     # Monitor active calls, track call state, cleanup on disconnect,
│   │   │       │                   # handle call timeouts
│   │   │
│   │   ├── 📄 app.js              # Express app setup: CORS config (allow frontend origin),
│   │   │                           # JSON/urlencoded parsing, Morgan HTTP logging,
│   │   │                           # static file serving (/uploads), route registration,
│   │   │                           # health check endpoint (/health), error handling middleware,
│   │   │                           # 404 handler
│   │   │
│   │   └── 📄 server.js           # Entry point: load .env (dotenv), connectDB(),
│   │       │                       # create HTTP server, initSocket(server), server.listen(PORT),
│   │       │                       # handle unhandledRejection
│   │
│   ├── 📂 uploads/                # Thư mục lưu file upload (images, documents, videos)
│   │                              # Được mount vào Docker volume: uploads_data
│   │
│   ├── 📄 Dockerfile              # Backend container: node:18-alpine, WORKDIR /app,
│   │                              # COPY package*.json, npm install, COPY ., EXPOSE 5000, CMD npm start
│   │
│   ├── 📄 package.json            # Dependencies: express, socket.io, mongoose, redis, jsonwebtoken,
│   │                              # bcryptjs, multer, nodemailer, @socket.io/redis-adapter, cors, morgan, dotenv, uuid
│   │                              # Scripts: start (prod), dev (nodemon)
│   │
│   ├── 📄 .env.example            # Environment template: PORT, NODE_ENV, MONGODB_URI, REDIS_URL,
│   │                              # JWT_SECRET, JWT_EXPIRE, EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS,
│   │                              # CLIENT_URL, MAX_FILE_SIZE
│   │
│   └── 📄 .env                    # (Không commit) Actual environment variables for local/production
│
├── 📂 client/                     # FRONTEND - React 18 + Vite SPA (Port 3000)
│   ├── 📂 src/
│   │   ├── 📂 assets/             # Static assets (images, logos, backgrounds)
│   │   │   ├── bg.png             # Background image for login/auth pages
│   │   │   ├── logo.png           # App logo (used in sidebar, login, etc.)
│   │   │   └── luongcall.jpg      # Call screen background (video call placeholder)
│   │   │
│   │   ├── 📂 pages/              # Page components (mỗi page = 1 route trong App.jsx)
│   │   │   ├── Login.jsx          # Login page: email/password form, validation, submit to authStore.login(),
│   │   │   │                       # navigate to /chat on success, link to register/forgot-password
│   │   │   │
│   │   │   ├── Register.jsx       # Register page: username/email/password/confirmPassword form,
│   │   │   │                       # validation, submit to authStore.register(), email verification flow
│   │   │   │
│   │   │   ├── Chat.jsx           # MAIN CHAT PAGE (3249 dòng): message list with virtual scroll,
│   │   │   │                       # message input with emoji picker, file/image upload, reactions picker,
│   │   │   │                       # reply/forward/pin/edit/delete actions, call buttons (audio/video),
│   │   │   │                       # ChatInfoPanel (right sidebar), message search, link preview,
│   │   │   │                       # typing indicator, read receipts, system messages
│   │   │   │
│   │   │   ├── Friends.jsx        # Friends management page: friend list with online status,
│   │   │   │                       # add friend modal, remove friend, search users
│   │   │   │
│   │   │   ├── Profile.jsx        # User profile page: view/edit username, bio, avatar upload,
│   │   │   │                       # gender selection, change password
│   │   │   │
│   │   │   ├── SearchUsers.jsx    # Search page: find users by username/email, send friend requests,
│   │   │   │                       # view user profiles
│   │   │   │
│   │   │   ├── CallRoom.jsx       # Group video/audio call room: WebRTC with multiple participants,
│   │   │   │                       # video grid layout, mic/cam toggle, screen share, call duration,
│   │   │   │                       # participant list, leave call
│   │   │   │
│   │   │   ├── DirectCallRoom.jsx # 1-on-1 call room: simpler than group call,
│   │   │   │                       # video preview, controls, call info
│   │   │   │
│   │   │   ├── ForgotPassword.jsx # Forgot password: enter email, submit to API,
│   │   │   │                       # show confirmation message
│   │   │   │
│   │   │   ├── ResetPassword.jsx  # Reset password: enter new password with token from URL,
│   │   │   │                       # submit to API, redirect to login
│   │   │   │
│   │   │   └── AdminReports.jsx   # Admin page: view/handle user reports, filter by status,
│   │   │       │                   # approve/reject reports, role-based access (admin/moderator only)
│   │   │
│   │   ├── 📂 components/         # Reusable UI components
│   │   │   ├── Sidebar.jsx        # SIDEBAR (2253 dòng): IconBar (left navigation with icons),
│   │   │   │                       # ChatPanel (conversations/friends/requests tabs),
│   │   │   │                       # GroupChatPanel (group conversations list),
│   │   │   │                       # SettingsPage modal (profile, security, appearance, messages, calls, shortcuts),
│   │   │   │                       # AvatarMenu (user info, logout), Settings icon, Notifications bell,
│   │   │   │                       # dark mode toggle, font size adjustment
│   │   │   │
│   │   │   ├── CallManager.jsx    # WebRTC call manager: handle peer connections, media streams,
│   │   │   │                       # add/remove tracks, ICE candidates, call state management,
│   │   │   │                       # error handling, device selection
│   │   │   │
│   │   │   ├── ChatInfoPanel.jsx  # Right panel for 1-1 chat: conversation info, other user's profile,
│   │   │   │                       # shared files/images, search in chat, mute notifications,
│   │   │   │                       # block user, delete conversation
│   │   │   │
│   │   │   ├── GroupInfoPanel.jsx # Right panel for groups: group info (name, avatar, description),
│   │   │   │                       # member list with roles, add/remove members, group settings,
│   │   │   │                       # leave group, delete group (admin only)
│   │   │   │
│   │   │   ├── GroupChatPanel.jsx # Panel for group conversations list: similar to ChatPanel
│   │   │   │                       # but filtered for group conversations only
│   │   │   │
│   │   │   └── call/              # Call-related sub-components (video preview, controls,
│   │   │       │                   # participant tile, call stats...)
│   │   │
│   │   ├── 📂 hooks/              # Custom React hooks
│   │   │   └── useSocket.js       # Socket.io connection hook: auto-connect when user logs in,
│   │   │       │                   # disconnect when logs out, event listeners setup/cleanup,
│   │   │       │                   # emit user_online on connect, handle reconnection
│   │   │
│   │   ├── 📂 store/              # Zustand state management (global state)
│   │   │   └── authStore.js       # Auth state: user, token, loading,
│   │   │       │                   # actions: login(credentials), logout(), register(userData),
│   │   │       │                   # updateUser(userData), refreshUser(),
│   │   │       │                   # persist to localStorage (auth-storage)
│   │   │
│   │   ├── 📂 services/           # API service layer (axios calls)
│   │   │   └── authService.js     # Axios API calls: login(email,password), register(userData),
│   │   │       │                   # getCurrentUser(), forgotPassword(email), resetPassword(token,password),
│   │   │       │                   # baseURL from VITE_API_URL
│   │   │
│   │   ├── 📂 utils/              # Helper functions
│   │   │   ├── callErrors.js      # Error code mappings for call failures (e.g., ICE_ERROR, TIMEOUT),
│   │   │   │                       # user-friendly error messages
│   │   │   │
│   │   │   ├── callStorage.js     # LocalStorage helpers for call state persistence,
│   │   │   │                       # save/restore call history
│   │   │   │
│   │   │   ├── deviceSession.js   # Track device sessions (login/logout times),
│   │   │   │                       # upsertDeviceSession(), getDeviceSession()
│   │   │   │
│   │   │   └── webrtcHelper.js    # WebRTC utilities: getMediaStream(audio/video),
│   │   │       │                   # addTrack(stream, peerConnection), removeTrack(track),
│   │   │       │                   # handle device changes
│   │   │
│   │   ├── 📂 config/             # Frontend configuration
│   │   │   └── callConfig.js      # WebRTC config: ICE servers (STUN/TURN), call timeouts,
│   │   │       │                   # retry settings, max call duration
│   │   │
│   │   ├── 📄 App.jsx             # Main App component: BrowserRouter, Routes setup,
│   │   │                           # ProtectedRoute (redirect to /login if not authenticated),
│   │   │                           # PublicRoute (redirect to /chat if authenticated),
│   │   │                           # AdminRoute (check user.role), route definitions,
│   │   │                           # Toaster for notifications
│   │   │
│   │   ├── 📄 main.jsx            # React entry point: ReactDOM.createRoot, render App,
│   │   │                           # import index.css (Tailwind)
│   │   │
│   │   └── 📄 index.css           # Global styles: Tailwind directives (@tailwind base/components/utilities),
│   │       │                       # custom CSS variables (--chat-font-size), dark mode styles,
│   │       │                       # scrollbar styling, chat bubble styles
│   │
│   ├── 📄 index.html              # HTML template: root div with id="root", script type="module",
│   │                              # meta tags, title
│   │
│   ├── 📄 vite.config.js          # Vite config: React plugin, port 3000, server proxy to backend,
│   │                              # build output directory
│   │
│   ├── 📄 tailwind.config.js      # Tailwind config: content paths, custom colors, fonts,
│   │                              # dark mode: 'class' strategy
│   │
│   ├── 📄 postcss.config.js       # PostCSS config: Tailwind + Autoprefixer plugins
│   │
│   ├── 📄 Dockerfile              # Multi-stage build: Stage 1 - build React app (npm install, npm run build),
│   │                              # Stage 2 - serve with Nginx (copy build to /usr/share/nginx/html)
│   │
│   ├── 📄 nginx.conf              # Nginx config for SPA: try_files $uri /index.html (for React Router),
│   │                              # proxy_pass API requests to backend, cache static assets
│   │
│   ├── 📄 package.json            # Dependencies: react, react-dom, react-router-dom, socket.io-client,
│   │                              # zustand, axios, tailwindcss, lucide-react, react-hot-toast,
│   │                              # vite, @vitejs/plugin-react
│   │                              # Scripts: dev (vite), build (vite build), preview (vite preview)
│   │
│   ├── 📄 .dockerignore           # Docker ignore: node_modules, .env, .git, dist...
│   │
│   └── 📄 .env                    # (Không commit) VITE_API_URL=http://localhost:5000/api,
│                                  # VITE_SOCKET_URL=http://localhost:5000
│
├── 📂 nginx/                      # NGINX - Load Balancer & Reverse Proxy (Port 80/443)
│   └── 📄 nginx.conf              # Config: upstream backend servers (for load balancing),
│       │                           # proxy_pass for /api/* to backend,
│       │                           # proxy_pass for /socket.io/* to backend (WebSocket),
│       │                           # ip_hash for sticky sessions (required for Socket.io),
│       │                           # try_files for SPA fallback,
│       │                           # gzip compression, cache headers, SSL config (nếu có)
│
└── 📂 docs/                       # DOCUMENTATION
    ├── 📂 architecture/
    │   ├── cautrucnhanh.md        # Cấu trúc nhanh (file này)
    │   └── PROJECT_STRUCTURE.md   # Cấu trúc chi tiết + luồng dữ liệu + best practices
    ├── 📂 analysis/
    │   ├── CALL_ERROR_DEBUG_QUICK_GUIDE.md  # Hướng dẫn debug lỗi call WebRTC
    │   ├── CALL_LOGIC_ANALYSIS.md            # Phân tích logic call flow
    │   ├── CAMERA_FIX_SUMMARY.md             # Tóm tắt fix camera issues
    │   └── FILES_CREATED_SUMMARY.md          # Tổng kết các file đã tạo
    └── 📂 setup/
        └── SETUP_GUIDE.md         # Hướng dẫn setup từ A-Z (Docker, local dev, production)

```

---

## 🔑 File Chức năng Quan trọng

### Backend Core Files

#### 1. `server/src/server.js` - Entry Point
```javascript
// Khởi động backend server
// 1. Load environment variables từ .env
// 2. Kết nối MongoDB
// 3. Tạo HTTP server từ Express app
// 4. Khởi tạo Socket.io server
// 5. Lắng nghe trên PORT (default: 5000)
// 6. Handle unhandled promise rejections
```

#### 2. `server/src/app.js` - Express App Setup
```javascript
// Cấu hình Express application
// - CORS: cho phép frontend origin
// - JSON/urlencoded parsing
// - Morgan HTTP logging
// - Serve static files từ /uploads
// - Register API routes
// - Health check endpoint (/health)
// - Error handling middleware
// - 404 handler
```

#### 3. `server/src/socket/index.js` - Socket.io Initialization
```javascript
// Khởi tạo Socket.io server với Redis Adapter
// - Tạo pub/sub Redis clients
// - JWT authentication middleware (io.use)
// - Connection handler
// - Setup message, presence, call handlers
// - Helper functions: getIO(), emitToUser(), emitToRoom()
```

#### 4. `server/src/config/redis.js` - Redis Setup
```javascript
// Redis client connection và cache helpers
// - createClient() với URL từ env
// - cacheSet(key, value, ttl)
// - cacheGet(key)
// - cacheDel(key)
// - Connection event handlers
```

### Frontend Core Files

#### 1. `client/src/main.jsx` - React Entry Point
```javascript
// Điểm bắt đầu của React application
// - Tạo ReactDOM root
// - Render App component
// - Import global styles (Tailwind)
```

#### 2. `client/src/App.jsx` - Main App + Routing
```javascript
// Cấu hình React Router
// - BrowserRouter wrapper
// - ProtectedRoute: redirect to /login if not authenticated
// - PublicRoute: redirect to /chat if authenticated
// - AdminRoute: check user.role (admin/moderator)
// - Route definitions for all pages
// - Toaster for toast notifications
```

#### 3. `client/src/hooks/useSocket.js` - Socket Connection Hook
```javascript
// Custom hook quản lý Socket.io connection
// - Auto-connect khi user login (có token)
// - Disconnect khi logout
// - Event listeners setup/cleanup
// - Emit user_online on connect
// - Handle reconnection logic
```

#### 4. `client/src/store/authStore.js` - Authentication State
```javascript
// Zustand store cho authentication
// - State: user, token, loading
// - Actions: login(), logout(), register(), updateUser(), refreshUser()
// - Persist to localStorage (auth-storage)
// - Set axios Authorization header
// - Handle device session tracking
```

### Infrastructure Files

#### 1. `docker-compose.yml` - Service Orchestration
```yaml
# Định nghĩa 5 services:
# 1. mongodb: Database (port 27017)
# 2. redis: Cache & Pub/Sub (port 6379)
# 3. backend: API server (port 5000)
# 4. frontend: React app (port 3000)
# 5. nginx: Load balancer (port 80/443)
# Volumes: mongodb_data, redis_data, uploads_data
# Networks: chat-network (bridge)
```

#### 2. `nginx/nginx.conf` - Load Balancer Config
```nginx
# Cấu hình Nginx
# - upstream backend servers (cho load balancing)
# - proxy_pass /api/* to backend
# - proxy_pass /socket.io/* to backend (WebSocket)
# - ip_hash for sticky sessions (Socket.io requirement)
# - try_files $uri /index.html (SPA fallback)
# - gzip compression
# - Cache headers for static assets
```

---

## 🔄 Luồng Dữ liệu Chính

### 1. Authentication Flow
```
User (Browser)
    ↓
POST /api/auth/login (email, password)
    ↓
Auth Controller
    ↓
→ Verify credentials (bcrypt.compare)
→ Generate JWT token
→ Return { user, token }
    ↓
Frontend stores token in localStorage + Zustand
    ↓
All subsequent requests include:
    Authorization: Bearer {token}
    ↓
Socket.io connection with token in handshake.auth
```

### 2. Real-time Messaging Flow
```
User A types message and clicks Send
    ↓
Socket.emit('send_message', { conversationId, content, type })
    ↓
Backend messageHandler receives event
    ↓
→ Validate user is in conversation
→ Save message to MongoDB
→ Update conversation.lastMessage
→ Emit to conversation room
    ↓
Socket.to(`conversation:${conversationId}`).emit('new_message', { message, conversationId })
    ↓
All users in conversation receive 'new_message' event
    ↓
Frontend updates message list in real-time
```

### 3. WebRTC Call Flow
```
User A initiates call
    ↓
Socket.emit('call_offer', { targetUserId, type: 'audio'|'video' })
    ↓
Backend forwards to User B via socket.to(`user:${targetUserId}`).emit('call_offer')
    ↓
User B accepts call
    ↓
Socket.emit('call_answer', { callId })
    ↓
WebRTC peer connection established
    ↓
Exchange ICE candidates via 'ice_candidate' events
    ↓
Media streams flow peer-to-peer
    ↓
Call ends: Socket.emit('call_end')
```

### 4. Scaling with Redis (Level 4)
```
User A → Backend Server 1 (Socket.io)
                    ↓
              Redis Pub/Sub
                    ↓
User B → Backend Server 2 (Socket.io)

Message từ Server 1 được publish lên Redis,
Redis broadcast tới tất cả servers,
Server 2 nhận và emit tới User B
```

---

## 📊 Database Schema

### users Collection
```javascript
{
  _id: ObjectId,
  username: String (3-30 chars, required),
  email: String (unique, required, lowercase),
  password: String (hashed with bcrypt, select: false),
  role: String (enum: 'user'|'moderator'|'admin', default: 'user'),
  isVerified: Boolean (default: false),
  verificationToken: String,
  verificationExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  avatar: String (URL, default: ui-avatars.com),
  bio: String (max 200 chars),
  gender: String (enum: 'male'|'female'|'other'),
  isOnline: Boolean (default: false),
  lastSeen: Date,
  friends: [ObjectId],
  formerFriends: [ObjectId],
  friendRequests: [{ from: ObjectId, createdAt: Date }],
  blockedUsers: [ObjectId],
  createdAt: Date,
  updatedAt: Date
}
```

### conversations Collection
```javascript
{
  _id: ObjectId,
  name: String (for groups),
  type: String (enum: 'private'|'group'|'community', default: 'private'),
  isGroup: Boolean (default: false),
  participants: [ObjectId],
  formerParticipants: [ObjectId],
  formerParticipantMeta: [{ user: ObjectId, leftAt: Date, historyVisibleUntil: Date }],
  admin: ObjectId (for groups),
  permissions: { allowMembersAddParticipants: Boolean },
  avatar: String (URL),
  lastMessage: ObjectId (ref: Message),
  pinnedMessages: [Mixed],
  isActive: Boolean (default: true),
  dissolvedAt: Date,
  dissolvedBy: ObjectId,
  historyVisibleUntil: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### messages Collection
```javascript
{
  _id: ObjectId,
  conversation: ObjectId (ref: Conversation, required, indexed),
  sender: ObjectId (ref: User, required),
  type: String (enum: 'text'|'image'|'file'|'video'|'audio'|'system'),
  content: String (required for text/system),
  fileUrl: String,
  fileName: String,
  fileSize: Number,
  metadata: Mixed,
  replyTo: ObjectId (ref: Message),
  readBy: [ObjectId],
  deletedFor: [ObjectId],
  isEdited: Boolean (default: false),
  editHistory: [{ content: String, editedAt: Date }],
  reactions: Map { emoji: [ObjectId] },
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🎯 Tính năng đã Implement

### ✅ Level 1 - HOÀN THÀNH
- [x] User registration & login (JWT)
- [x] Email verification
- [x] Forgot/Reset password
- [x] Search users (by username/email)
- [x] Friend request system (send/accept/reject/cancel)
- [x] Private chat (1-1) real-time
- [x] Message history (MongoDB)
- [x] Message read status (readBy array)
- [x] Online/Offline status
- [x] User profile management

### ✅ Level 2 - HOÀN THÀNH
- [x] Group chat (create, add/remove members)
- [x] File/Image upload (multer)
- [x] Message reactions (emoji)
- [x] Reply to messages
- [x] Forward messages
- [x] Pin messages
- [x] Edit/Delete messages
- [x] Search messages
- [x] Typing indicator

### ✅ Level 3 - HOÀN THÀNH
- [x] WebRTC signaling
- [x] 1-on-1 Video call
- [x] 1-on-1 Audio call
- [x] Group Video/Audio call
- [x] Mic/Camera toggle
- [x] Call notifications
- [x] Call history

### ✅ Level 4 - HOÀN THÀNH
- [x] Redis Adapter for Socket.io
- [x] Nginx Load Balancer
- [x] Redis Caching
- [x] Docker containerization
- [x] Multi-instance backend support

---

## 📦 Dependencies Chính

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.19.2 | Web framework |
| socket.io | ^4.7.5 | Real-time communication |
| mongoose | ^8.3.0 | MongoDB ODM |
| redis | ^4.6.13 | Caching & Pub/Sub |
| jsonwebtoken | ^9.0.2 | JWT authentication |
| bcryptjs | ^2.4.3 | Password hashing |
| multer | ^1.4.5-lts.1 | File uploads |
| nodemailer | ^8.0.1 | Email sending |
| @socket.io/redis-adapter | ^8.3.0 | Socket.io scaling |
| cors | ^2.8.5 | CORS middleware |
| morgan | ^1.10.0 | HTTP logging |
| dotenv | ^16.4.5 | Environment variables |
| uuid | ^9.0.1 | Unique ID generation |

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.3.1 | UI library |
| react-dom | ^18.3.1 | React DOM rendering |
| react-router-dom | ^6.23.0 | Client-side routing |
| socket.io-client | ^4.7.5 | WebSocket client |
| zustand | ^4.5.2 | State management |
| axios | ^1.7.2 | HTTP client |
| tailwindcss | ^3.4.3 | Utility-first CSS |
| lucide-react | ^0.378.0 | Icon library |
| react-hot-toast | ^2.4.1 | Toast notifications |
| react-icons | ^5.6.0 | Additional icons |
| vite | ^5.2.11 | Build tool |

---

## 🔧 Environment Variables

### Backend (.env)
```env
NODE_ENV=development|production
PORT=5000
MONGODB_URI=mongodb://admin:password123@mongodb:27017/chatapp?authSource=admin
REDIS_URL=redis://redis:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
CLIENT_URL=http://localhost:3000
MAX_FILE_SIZE=10485760
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🚀 Cách Mở rộng Dự án

### Thêm Feature mới

#### Backend
```
1. Tạo model (nếu cần) trong server/src/models/
2. Tạo route trong server/src/routes/
3. Tạo controller trong server/src/controllers/
4. Register route trong server/src/app.js
5. (Optional) Thêm socket handler trong server/src/sockets/
```

#### Frontend
```
1. Tạo component trong client/src/components/
2. Tạo page (nếu cần) trong client/src/pages/
3. Thêm route trong client/src/App.jsx
4. Tạo store (nếu cần) trong client/src/store/
```

### Example: Thêm Notification Feature

**Backend**:
```javascript
// server/src/models/notification.model.js
// server/src/routes/notification.route.js
// server/src/controllers/notification.controller.js
// server/src/sockets/notificationHandler.js
```

**Frontend**:
```javascript
// client/src/components/NotificationBell.jsx
// client/src/store/notificationStore.js
```

---

## 📊 Best Practices được Apply

1. **Modular Architecture**: Tách rời routes, controllers, models
2. **Environment Variables**: Không hard-code sensitive data
3. **Error Handling**: Try-catch blocks, error middleware
4. **Security**: JWT auth, password hashing, CORS, input validation
5. **Scalability**: Redis adapter, load balancing ready
6. **Code Organization**: Clear folder structure, naming conventions
7. **Docker**: Containerized services for easy deployment
8. **Documentation**: README, comments, setup guides
9. **Real-time**: Socket.io for bidirectional communication
10. **Responsive**: TailwindCSS for mobile-first design

---

## 🔜 Next Steps để Hoàn thiện

### Immediate
1. Add unit tests (Jest + Supertest for backend, React Testing Library for frontend)
2. Add E2E tests (Cypress/Playwright)
3. Implement rate limiting (express-rate-limit)
4. Add input validation/sanitization (Joi/zod)

### Production Ready
5. Setup CI/CD pipeline (GitHub Actions/GitLab CI)
6. Add monitoring (PM2, logs, error tracking)
7. SSL certificates (Let's Encrypt)
8. Database backups (automated)
9. Performance optimization (caching, CDN)
10. Accessibility improvements (WCAG compliance)