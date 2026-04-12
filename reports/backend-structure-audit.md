# Backend Structure Audit

## Scope
Reviewed existing backend entrypoints:
- `server/src/app.js`
- `server/src/server.js`

No source files were modified as part of this audit.

## Findings

### 1. Thin entrypoints but missing visible application layers
**Files:** `server/src/app.js`, `server/src/server.js`

The app/server split is good, but the visible backend surface only shows route mounting and bootstrapping. From the available files, there is no evidence of a centralized controller/service/repository structure, request validation layer, or shared async error wrapper.

**Why it matters**
As a chat app grows, route-heavy codebases often accumulate fat route files, duplicated business logic, and inconsistent error handling if services/use-cases are not clearly separated.

**Recommendation**
- Keep routes thin and delegate to controllers/services.
- Prefer clear boundaries such as:
  - `routes/`
  - `controllers/`
  - `services/`
  - `models/`
  - `middlewares/`
  - `sockets/`
- If these layers already exist, document them clearly because the current entrypoints do not make the architecture discoverable.

### 2. Error middleware is too generic for long-term maintainability
**File:** `server/src/app.js`

There is a global error handler and a 404 handler, which is good, but the error handler only returns `err.status || 500` and `err.message`.

**Risks**
- No standardized error shape or machine-readable code.
- No distinction between validation, auth, business, and unexpected errors.
- Stack logging is unconditional and may not fit production logging standards.

**Recommendation**
- Introduce application error classes or a shared error utility with fields like:
  - `statusCode`
  - `code`
  - `message`
  - `details`
- Standardize error payloads across HTTP and socket flows.
- Make logging environment-aware.

### 3. No visible async error capture strategy
**File:** `server/src/app.js`

Express 4 does not automatically catch async errors in route handlers unless they are wrapped or passed to `next`.

**Recommendation**
- Add a shared `asyncHandler` wrapper for controllers.
- Audit route handlers to ensure async failures reach the error middleware consistently.

### 4. CORS configuration may drift from frontend/socket reality
**File:** `server/src/app.js`

The server allows `process.env.CLIENT_URL || 'http://localhost:3000'`.

**Risks**
- Vite commonly uses port `5173`, not `3000`.
- A single origin string may become brittle across environments.
- Socket.io CORS often needs to match Express CORS; mismatch causes confusing connection issues.

**Recommendation**
- Align the default dev origin with the actual frontend dev server.
- Support environment-based allowlists if multiple origins are needed.
- Ensure Socket.io uses the same origin policy as Express.

### 5. Static uploads serving is underspecified
**File:** `server/src/app.js`

`app.use('/uploads', express.static('uploads'))` assumes a relative folder and implies public access.

**Risks**
- Relative paths can break depending on working directory.
- Public file serving may be inappropriate for private attachments.
- Upload governance is not visible.

**Recommendation**
- Resolve the uploads path explicitly from project root.
- Document whether uploads are intentionally public.
- If chat attachments may be sensitive, serve them through controlled routes or signed access.

### 6. Startup sequence may not wait for infrastructure readiness
**File:** `server/src/server.js`

`connectDB();` is called before server startup, but not awaited in the visible code.

**Risk**
The HTTP server may begin accepting requests before MongoDB is fully connected.

**Recommendation**
- Use an async startup flow:
  1. load env
  2. await DB connection
  3. initialize socket/Redis dependencies
  4. start listening
- If `connectDB()` already blocks internally, document that behavior explicitly.

### 7. Socket bootstrap is opaque and therefore high-risk
**File:** `server/src/server.js`

`initSocket(server)` is called, but lifecycle, auth handshake, adapter setup, and cleanup are not visible from the reviewed files.

**Common chat-backend risks**
- Socket auth diverges from HTTP auth.
- Presence/session cleanup leaks on disconnect.
- Redis adapter failure paths are undocumented.
- Event contracts drift without documentation.

**Recommendation**
- Organize sockets with dedicated modules such as:
  - `sockets/index.js`
  - `sockets/handlers/`
  - `sockets/middleware/`
  - presence/session utilities
- Document socket event names, payloads, and auth expectations.
- Confirm behavior when Redis or pub/sub dependencies are unavailable.

### 8. Process failure and shutdown handling is incomplete
**File:** `server/src/server.js`

There is handling for `unhandledRejection`, but no visible graceful shutdown for all infrastructure.

**Missing pieces**
- `uncaughtException` strategy
- `SIGINT`/`SIGTERM` handling
- explicit Mongo/Redis/socket cleanup

**Recommendation**
- Centralize graceful shutdown for:
  - HTTP server
  - Mongo connection
  - Redis clients
  - Socket resources
- Add shutdown logging and exit codes.

### 9. Health endpoint is too shallow
**File:** `server/src/app.js`

`/health` always reports success and a timestamp.

**Risk**
It may report healthy even if MongoDB, Redis, or Socket.io dependencies are degraded.

**Recommendation**
- Split checks into:
  - liveness endpoint
  - readiness endpoint
- Use readiness for infrastructure-aware deployment checks.

### 10. Route surface is visible, but architecture discoverability is weak
**File:** `server/src/app.js`

Mounted domains are:
- `/api/auth`
- `/api/users`
- `/api/messages`
- `/api/conversations`
- `/api/friends`
- `/api/reports`

This suggests a substantial backend, but there is no visible API versioning or route-ownership convention from the reviewed entrypoints.

**Recommendation**
- Document the route map.
- Consider `/api/v1/...` versioning before expansion.
- Define naming and ownership conventions for domains.

### 11. Security middleware surface appears minimal
**File:** `server/src/app.js`

Visible middleware includes:
- `cors`
- JSON/body parsing
- `morgan`

For a public chat backend, this makes the security posture hard to discover.

**Recommendation**
- Verify auth is consistently applied at route level.
- Document or add request size limits, upload constraints, and abuse protections.
- Ensure security decisions are visible and maintainable.

### 12. Logging strategy is development-oriented
**Files:** `server/src/app.js`, `server/src/server.js`

`morgan('dev')` and `console.log/error` are useful locally but weak for production troubleshooting, especially with socket activity.

**Recommendation**
- Standardize logging format and environment behavior.
- Ensure HTTP and socket logs are consistent enough to trace realtime issues.

## Cleanup Priorities
1. Make startup deterministic by awaiting critical infrastructure before `listen`.
2. Align Socket.io and HTTP auth/CORS behavior.
3. Standardize async error handling and error payloads.
4. Clarify architecture boundaries and document them.
5. Improve readiness checks and graceful shutdown.
6. Reassess upload serving and security posture.

## Limitations
Tooling inconsistencies prevented a reliable recursive listing of `server/src`, even though `server/src/app.js` and `server/src/server.js` were readable. This audit is therefore based on the two confirmed entrypoints and the risks implied by their current structure, not a fully verified backend tree.

## Confirmed Contracts
From the reviewed files, the following contracts are confirmed:
- `server/src/app.js` exports default `app`
- `server/src/server.js` imports:
  - `connectDB` from `./config/database.js`
  - `initSocket` from `./sockets/index.js`
- Confirmed mounted endpoints:
  - `/api/auth`
  - `/api/users`
  - `/api/messages`
  - `/api/conversations`
  - `/api/friends`
  - `/api/reports`
  - `/uploads`
  - `/health`