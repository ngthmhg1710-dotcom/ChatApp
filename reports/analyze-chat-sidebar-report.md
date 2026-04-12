# Chat/Sidebar analysis report

## Files reviewed
- client/src/pages/Chat.jsx
- client/src/components/Sidebar.jsx

## 1) Concrete bugs likely causing current issues

### A. Runtime crash in Sidebar chat list
- In `client/src/components/Sidebar.jsx`, `ChatPanel` uses:
  - `const hasActiveCall = activeCall?.conversationId === conv._id;`
- But `activeCall` is **not defined** inside `ChatPanel` and is not passed as a prop.
- `Sidebar` receives `activeCall` from `Chat.jsx` but does not forward it to `ChatPanel`.

**Impact**
- Likely `ReferenceError: activeCall is not defined` when rendering chat rows.
- Breaks sidebar chat list rendering and active call indicator.

### B. Active call indicator contract is partially wired but broken
- `Chat.jsx` keeps `activeCall` state via `onCallStateChange` from `CallManager`.
- It passes `activeCall` to `Sidebar`.
- `Sidebar` does not pass it to `ChatPanel`, even though `ChatPanel` tries to use it.

**Impact**
- Even if runtime error is avoided, sidebar “Đang gọi / Tham gia” state cannot work.

### C. Former friends payload likely read from wrong path
- In `Sidebar.jsx`:
  - `setFormerFriends(data.formerFriends || []);`
- Same file otherwise reads API payloads mostly from `data.data` or nested payloads.

**Impact**
- Former-friend search results likely never populate unless backend happens to return that exact top-level field.

### D. Dynamic Tailwind classes in Chat avatar are unsafe
- In `Chat.jsx`, `Avatar` builds classes like:
  - ``w-${size} h-${size}``
- Tailwind may not generate those classes reliably in production/JIT-safe builds.

**Impact**
- Avatar sizing may break or become inconsistent after build.

### E. Temp optimistic message cleanup is too broad
- In `Chat.jsx`, `onNewMsg` removes temp messages by matching only sender id:
  - all `temp-*` from same sender are filtered out.
- If current user sends multiple messages quickly, one confirmed message can remove several pending temp messages.

**Impact**
- Missing/flickering messages, wrong ordering, confusing optimistic UI.

### F. Duplicate send-branch logic in `handleSendMessage`
- `Chat.jsx` checks `hasFiles/hasImages`, then repeats the same checks again immediately after.

**Impact**
- Not the main bug, but dead duplicate logic increases regression risk and makes send flow harder to trust.

### G. Clipboard calls are not guarded
- `Chat.jsx` uses `navigator.clipboard.writeText(...)` directly in message copy/share flows.

**Impact**
- Can throw in unsupported/insecure contexts and break that interaction.

### H. Forward modal does not guard missing socket
- `ForwardModal` emits `socket.emit('send_message', ...)` without checking `socket`.

**Impact**
- Forwarding can fail noisily during reconnect/null socket state.

### I. Sidebar socket listener effect churn
- `ChatPanel` socket effect depends on `friends`, so listeners are rebound whenever friends list changes.

**Impact**
- Cleanup exists, so not a hard leak, but this increases stale-closure risk and makes socket UI harder to reason about.

## 2) Minimal safe fixes

### Highest priority
1. In `client/src/components/Sidebar.jsx`
   - Add `activeCall` to `ChatPanel` props.
   - Pass `activeCall={activeCall}` from `Sidebar` to `ChatPanel`.

### Next safe fixes
2. In `client/src/components/Sidebar.jsx`
   - Change former friends payload read to a safe fallback:
   - `data.data?.formerFriends || data.formerFriends || []`

3. In `client/src/pages/Chat.jsx`
   - Replace dynamic avatar classes with a fixed size map for known values.

4. In `client/src/pages/Chat.jsx`
   - Narrow temp-message replacement logic:
   - remove only one matching temp item, or match by sender + content/type/reply/file metadata instead of sender only.

5. In `client/src/pages/Chat.jsx`
   - Remove duplicated `hasFiles/hasImages` branch checks from `handleSendMessage`.

6. In `client/src/pages/Chat.jsx`
   - Guard clipboard usage with feature detection / try-catch.

7. In `client/src/pages/Chat.jsx`
   - Guard forward send with `if (!socket) return`.

## 3) Integration contracts CallManager depends on

From `client/src/pages/Chat.jsx`, `CallManager` currently relies on these props/contracts:

### Props passed into CallManager
- `socket`
  - Socket.IO client instance with `.on/.off/.emit`.

- `currentUser`
  - Expected to contain at least `_id`.
  - Likely also uses `username`, `avatar`.

- `otherUser`
  - For DM calls: object with at least `_id`, `username`, optional `avatar`.
  - For group context, `Chat.jsx` still passes a user-like fallback object.

- `conversationIsGroup`
  - Boolean.

- `groupParticipants`
  - Array of participants for group calls.
  - Usually expected to contain objects with `_id`.

- `conversationId`
  - Active conversation id.

- `onStartCall`
  - `CallManager` must provide a callable starter function through this callback.
  - `Chat.jsx` stores it in `startCallRef.current`.
  - Later invoked as:
    - `startCallRef.current?.('audio')`
    - `startCallRef.current?.('video')`

### Outbound callback contract: onCallEnd
`CallManager` is expected to call:
- `onCallEnd({ type, duration, status, isCaller, calleeId })`

Observed expected fields:
- `type`: `'audio' | 'video'`
- `duration`: number
- `status`: likely one of `'ended' | 'missed' | 'rejected' | 'cancelled'`
- `isCaller`: boolean
- `calleeId`: user id or null

`Chat.jsx` uses this to emit:
- `socket.emit('call_summary', { to, callType, status, duration, conversationId })`
- Only when `isCaller` is true.

### Outbound callback contract: onCallStateChange
`CallManager` is expected to call:
- `onCallStateChange(callInfo)`

Required shape inferred from Chat/Sidebar:
- `callInfo.isActive` must exist
- `callInfo.conversationId` should exist when active

Reason:
- `Chat.jsx` stores `activeCall = callInfo.isActive ? callInfo : null`
- `Sidebar/ChatPanel` uses:
  - `activeCall?.conversationId === conv._id`

So current cross-component contract for sidebar call badge is:
- `activeCall = { isActive: true, conversationId: string, ...optionalExtraFields }`

## Safe refactor opportunities

### Chat.jsx
Good extraction candidates without behavior change:
- `chatUtils.js`
  - `extractHttpUrls`
  - `linkHintLabel`
  - `formatMsgTime`
  - `formatGroupTime`
  - `formatFileSize`
  - `getFileUrl`
  - emoji helpers
- message UI components
  - `MessageBubble`
  - `CallMessageItem`
  - `PinnedBanner`
  - `PinNotification`
  - `SystemChatNotification`
  - `ForwardModal`
  - `ShareModal`

### Sidebar.jsx
Good extraction candidates without behavior change:
- `SettingsPage.jsx`
- `AvatarMenu.jsx`
- `IconBar.jsx`
- `ChatPanel.jsx`
- helper module for:
  - `isGroupConv`
  - `getOtherParticipant`
  - `getLastMessagePreview`
  - `formatTime`

## Highest-priority fix recommendation
- Fix `activeCall` wiring in `client/src/components/Sidebar.jsx` first.
- It is the clearest immediate runtime failure and directly affects call/chat integration.