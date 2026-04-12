## 📁 Chi tiết Cấu trúc Dự án Chat Application

> **Cập nhật**: Phiên bản đầy đủ với chú thích chi tiết cho từng file
> **Công nghệ**: React 18 + Vite (Frontend) | NodeJS + Express + Socket.io (Backend) | MongoDB + Redis | Docker

```
chat-app/
│
├── 📄 docker-compose.yml          # Orchestration - định nghĩa 5 services: MongoDB, Redis, Backend, Frontend, Nginx
├── 📄 README.md                   # Documentation chính - hướng dẫn cài đặt, tính năng, API
├── 📄 package.json                # Root package (chứa nodemailer dependency)
├── 📄 .gitignore                  # Git ignore rules - loại trừ node_modules, .env, uploads...
├── 📄 App.jsx                     # Root App component (có thể là file thừa, App chính ở client/src/)
│
├── 📂 server/                     # BACKEND - NodeJS + Express API Server
│   ├── 📂 src/
│   │   ├── 📂 config/             # Cấu hình kết nối và services
│   │   │   ├── database.js        # MongoDB connection với Mongoose, retry logic
│   │   │   ├── redis.js           # Redis client setup, cache helpers (cacheSet, cacheGet, cacheDel)
│   │   │   └── email.js           # Nodemailer config cho email verification, reset password
│   │   │
│   │   ├── 📂 models/             # Mongoose Schemas - định nghĩa cấu trúc database
│   │   │   ├── user.model.js      # User schema: username, email, password(hashed), avatar, bio, friends, friendRequests, blockedUsers, isOnline, lastSeen...
│   │   │   ├── conversation.model.js  # Conversation schema: type(private/group/community), participants, admin, lastMessage, pinnedMessages, dissolvedAt...
│   │   │   ├── message.model.js   # Message schema: conversation, sender, type(text/image/file/system), content, fileUrl, readBy, replyTo, reactions, editHistory, deletedFor...
│   │   │   └── report.model.js    # Report schema: reportedBy, reportedUser, reason, status, createdAt...
│   │   │
│   │   ├── 📂 routes/             # API Route definitions - mapping URLs to controllers
│   │   │   ├── auth.route.js      # /api/auth/* : register, login, logout, profile, change-password, forgot-password, reset-password
│   │   │   ├── user.route.js      # /api/users/* : search users, get user profile, update profile, upload avatar
│   │   │   ├── friend.route.js    # /api/friends/* : send request, accept, reject, cancel, remove friend, get requests
│   │   │   ├── conversation.route.js  # /api/conversations/* : create, get all, get one, update, delete, add/remove participants
│   │   │   ├── message.route.js   # /api/messages/* : get messages by conversation, upload file, search messages, mark as read
│   │   │   └── report.route.js    # /api/reports/* : create report, get reports (admin), update status
│   │   │
│   │   ├── 📂 controllers/        # Business Logic - xử lý yêu cầu từ routes
│   │   │   ├── auth.controller.js      # Register(login+email verify), Login(JWT generation), Logout, GetProfile, UpdateProfile, ChangePassword, ForgotPassword(reset token via email), ResetPassword
│   │   │   ├── user.controller.js      # SearchUsers(by username/email), GetUserProfile, UpdateUserProfile, UploadAvatar(multer), BlockUser, UnblockUser
│   │   │   ├── friend.controller.js    # SendFriendRequest, AcceptFriendRequest, RejectFriendRequest, CancelFriendRequest, RemoveFriend, GetFriendList, GetFriendRequests
│   │   │   ├── conversation.controller.js  # CreateConversation(1-1 or group), GetConversations(by user), UpdateConversation(name, avatar, participants), DeleteConversation, AddParticipants, RemoveParticipants, LeaveConversation
│   │   │   ├── message.controller.js   # GetMessages(pagination), UploadFile(multer config), SearchMessages(by content), MarkMessagesAsRead, DeleteMessage, UpdateMessage
│   │   │   └── report.controller.js    # CreateReport(user submits), GetReports(admin views), UpdateReportStatus(approve/reject/pending)
│   │   │
│   │   ├── 📂 middlewares/        # Express Middlewares - xử lý trước khi vào controller
│   │   │   ├── auth.middleware.js # JWT verification, attach user to req.user, role-based access control (admin/moderator/user)
│   │   │   └── error.middleware.js # (nếu có) Global error handler
│   │   │
│   │   ├── 📂 sockets/            # Socket.io Event Handlers - real-time communication
│   │   │   ├── index.js           # Socket.io initialization, Redis Adapter setup, JWT authentication middleware, connection handler
│   │   │   ├── messageHandler.js  # Handle 'send_message', 'edit_message', 'delete_message', 'mark_read', 'typing' events
│   │   │   ├── presenceHandler.js # Handle 'user_online', 'user_offline', 'get_online_users' events
│   │   │   └── callHandler.js     # WebRTC signaling: 'call_offer', 'call_answer', 'ice_candidate', 'call_reject', 'call_end'
│   │   │
│   │   ├── 📂 utils/              # Utility functions
│   │   │   ├── logger.js          # Console logger với timestamp, levels (info, warn, error)
│   │   │   ├── socketEmitter.js   # Helper functions: emitToUser, emitToRoom, forceUserLeaveConversation
│   │   │   └── callMonitor.js     # Monitor active calls, cleanup on disconnect
│   │   │
│   │   ├── 📄 app.js              # Express app setup: CORS, JSON parsing, Morgan logging, route registration, error handling, health check endpoint
│   │   └── 📄 server.js           # Entry point: load .env, connect DB, create HTTP server, init Socket.io, start listening
│   │
│   ├── 📂 uploads/                # Thư mục lưu file upload (images, documents)
│   ├── 📄 Dockerfile              # Backend container: Node.js image, copy files, npm install, expose port 5000
│   ├── 📄 package.json            # Dependencies: express, socket.io, mongoose, redis, jsonwebtoken, bcryptjs, multer, nodemailer...
│   ├── 📄 .env.example            # Environment template: PORT, MONGODB_URI, REDIS_URL, JWT_SECRET, EMAIL_HOST, EMAIL_USER...
│   └── 📄 .env                    # (Không commit) Actual environment variables
│
├── 📂 client/                     # FRONTEND - React 18 + Vite SPA
│   ├── 📂 src/
│   │   ├── 📂 assets/             # Static assets
│   │   │   ├── bg.png             # Background image
│   │   │   ├── logo.png           # App logo
│   │   │   └── luongcall.jpg      # Call screen background
│   │   │
│   │   ├── 📂 pages/              # Page components (mỗi page = 1 route)
│   │   │   ├── Login.jsx          # Login page: form, validation, submit to authStore.login()
│   │   │   ├── Register.jsx       # Register page: form, validation, submit to authStore.register()
│   │   │   ├── Chat.jsx           # MAIN CHAT PAGE (3249 dòng): message list, input, emoji picker, file upload, reactions, reply, forward, pin, edit, delete, call buttons
│   │   │   ├── Friends.jsx        # Friends management page: friend list, add friend, remove friend
│   │   │   ├── Profile.jsx        # User profile page: view/edit info, avatar upload
│   │   │   ├── SearchUsers.jsx    # Search page: find users by username/email
│   │   │   ├── CallRoom.jsx       # Group video/audio call room: WebRTC, multiple participants
│   │   │   ├── DirectCallRoom.jsx # 1-on-1 call room: simpler than group call
│   │   │   ├── ForgotPassword.jsx # Forgot password: enter email, receive reset link
│   │   │   ├── ResetPassword.jsx  # Reset password: enter new password with token from email
│   │   │   └── AdminReports.jsx   # Admin page: view/handle user reports (role-based)
│   │   │
│   │   ├── 📂 components/         # Reusable UI components
│   │   │   ├── Sidebar.jsx        # SIDEBAR (2253 dòng): IconBar (left nav), ChatPanel (conversations/friends/requests), GroupChatPanel, SettingsPage modal
│   │   │   ├── CallManager.jsx    # WebRTC call manager: handle peer connections, media streams, call UI
│   │   │   ├── ChatInfoPanel.jsx  # Right panel: conversation info, participants, shared files, search in chat
│   │   │   ├── GroupInfoPanel.jsx # Right panel for groups: group info, member list, add/remove members, group settings
│   │   │   ├── GroupChatPanel.jsx # Panel for group conversations list
│   │   │   └── call/              # Call-related components (video preview, controls...)
│   │   │
│   │   ├── 📂 hooks/              # Custom React hooks
│   │   │   └── useSocket.js       # Socket.io connection hook: auto-connect on login, disconnect on logout, event listeners
│   │   │
│   │   ├── 📂 store/              # Zustand state management
│   │   │   └── authStore.js       # Auth state: user, token, login(), logout(), register(), updateUser(), refreshUser() + persist to localStorage
│   │   │
│   │   ├── 📂 services/           # API service layer
│   │   │   └── authService.js     # Axios calls: login, register, getCurrentUser, forgotPassword, resetPassword
│   │   │
│   │   ├── 📂 utils/              # Helper functions
│   │   │   ├── callErrors.js      # Error code mappings for call failures
│   │   │   ├── callStorage.js     # LocalStorage helpers for call state persistence
│   │   │   ├── deviceSession.js   # Track device sessions (login/logout times)
│   │   │   └── webrtcHelper.js    # WebRTC utilities: getMediaStream, addTrack, removeTrack
│   │   │
│   │   ├── 📂 config/             # Frontend configuration
│   │   │   └── callConfig.js      # WebRTC config: ICE servers, call timeouts, retry settings
│   │   │
│   │   ├── 📄 App.jsx             # Main App component: React Router setup, protected routes, public routes, admin routes
│   │   ├── 📄 main.jsx            # React entry point: render App to DOM, setup providers
│   │   └── 📄 index.css           # Global styles: Tailwind directives, custom CSS variables, dark mode
│   │
│   ├── 📄 index.html              # HTML template: root div, script imports
│   ├── 📄 vite.config.js          # Vite config: React plugin, port, proxy to backend
│   ├── 📄 tailwind.config.js      # Tailwind config: custom colors, fonts, dark mode class strategy
│   ├── 📄 postcss.config.js       # PostCSS config: Tailwind + Autoprefixer plugins
│   ├── 📄 Dockerfile              # Multi-stage: build React app, serve with Nginx
│   ├── 📄 nginx.conf              # Nginx config for SPA: fallback to index.html, proxy API requests
│   ├── 📄 package.json            # Dependencies: react, react-router-dom, socket.io-client, zustand, axios, tailwindcss, lucide-react, react-hot-toast...
│   └── 📄 .env                    # (Không commit) VITE_API_URL, VITE_SOCKET_URL
│
├── 📂 nginx/                      # NGINX - Load Balancer & Reverse Proxy
│   └── 📄 nginx.conf              # Config: upstream backend servers, proxy_pass, WebSocket support (ip_hash for sticky sessions), SSL (nếu có)
│
└── 📂 docs/                       # DOCUMENTATION
    ├── 📂 architecture/
    │   ├── cautrucnhanh.md        # File này - cấu trúc nhanh
    │   └── PROJECT_STRUCTURE.md   # Cấu trúc chi tiết + luồng dữ liệu + best practices
    ├── 📂 analysis/
    │   ├── CALL_ERROR_DEBUG_QUICK_GUIDE.md  # Hướng dẫn debug lỗi call
    │   ├── CALL_LOGIC_ANALYSIS.md            # Phân tích logic call
    │   ├── CAMERA_FIX_SUMMARY.md             # Tóm tắt fix camera issues
    │   └── FILES_CREATED_SUMMARY.md          # Tổng kết các file đã tạo
    └── 📂 setup/
        └── SETUP_GUIDE.md         # Hướng dẫn setup từ A-Z

```

---

## 📊 Thống kê Dự án

| Component | Số file | Dòng code (ước tính) | Ghi chú |
|-----------|---------|---------------------|---------|
| Backend | ~20 files | ~5,000 LOC | Express + Socket.io + MongoDB |
| Frontend | ~25 files | ~15,000 LOC | React + Vite + Tailwind |
| Infrastructure | ~5 files | ~500 LOC | Docker + Nginx |
| Documentation | ~10 files | ~2,000 LOC | Guides + Analysis |

**Tổng**: ~60 files, ~22,500 dòng code

---

## 🔑 Các File Quan Trọng Cần Biết

### Backend
1. **`server/src/server.js`** - Entry point, khởi động server
2. **`server/src/app.js`** - Express app setup
3. **`server/src/socket/index.js`** - Socket.io initialization
4. **`server/src/models/*.js`** - Database schemas
5. **`server/src/controllers/*.js`** - Business logic

### Frontend
1. **`client/src/App.jsx`** - Router setup
2. **`client/src/pages/Chat.jsx`** - Main chat interface (LARGEST FILE)
3. **`client/src/components/Sidebar.jsx`** - Sidebar navigation (LARGEST FILE)
4. **`client/src/store/authStore.js`** - Auth state management
5. **`client/src/hooks/useSocket.js`** - Socket connection

### Infrastructure
1. **`docker-compose.yml`** - All services definition
2. **`nginx/nginx.conf`** - Load balancer config

---

## 🚨 Lưu ý Bảo mật

- **KHÔNG commit `.env`** - chứa secrets (JWT_SECRET, EMAIL_PASS, DB credentials)
- **Email password trong docker-compose.yml** cần được move sang `.env`
- **JWT_SECRET** cần được thay đổi trong production
- File uploads cần validation kỹ hơn (file type, size)

---

## 📝 Quy ước Đặt tên

- **Backend routes**: `/api/resource/:id` (RESTful)
- **Socket events**: `action_target` (e.g., `send_message`, `user_online`)
- **React components**: PascalCase (e.g., `ChatBox`, `MessageBubble`)
- **CSS classes**: kebab-case (e.g., `chat-bubble`, `message-sender`)
- **Database collections**: lowercase plural (e.g., `users`, `messages`, `conversations`)