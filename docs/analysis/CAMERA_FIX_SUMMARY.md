# Camera Loading State Fix - Summary

**Ngày**: 2024  
**Vấn đề**: Khi togglecamera (bật/tắt camera), UI bị "đơ" / lock vì đợi `getUserMedia()` permission dialog  
**Giải pháp**: Thêm loading state, error handling, và hiển thị text feedback ngay lập tức  

---

## 🐛 Vấn đề Gốc

**User Report**: "call khi mở camera lên có hiện tượng bị đơ... reload thì sẽ mất trang call"

### Root Cause
- `navigator.mediaDevices.getUserMedia()` là async, chờ user cho phép camera (permission dialog)
- Không có UI state change trước khi await
- User thấy màn hình đơ → reload → mất call session

### Dấu Hiệu
1. Click "Bật cam" → UI không phản ứng gì
2. Permission dialog hiện ra nhưng UI bị lock
3. Sau 1-2s mới có video hoặc error
4. User reload → tất cả mất, không thể rejoin

---

## ✅ Thay Đổi Được Thực Hiện

### 1. **CallManager.jsx** (Group/1-1 inline call)

#### ➕ Thêm State
```javascript
const [cameraLoading, setCameraLoading] = useState(false);
const [cameraError, setCameraError] = useState(null);
```

#### 🔄 Sửa `getLocalStream()` Function
- **Before**: `getUserMedia()` được await mà không có UI feedback
- **After**:  
  - Set `setCameraLoading(true)` ngay trước `getUserMedia()`
  - Wrap trong `try-finally` để luôn `setCameraLoading(false)`
  - Catch errors và set `setCameraError()` với message chi tiết
  - Handle cases: `NotAllowedError`, `NotFoundError`, `NotReadableError`

#### 🎨 Sửa ParticipantTile Component
- Thêm prop `cameraLoading`
- Render loading text khi `cameraLoading && isSelf`:
  ```jsx
  {cameraLoading && isSelf && (
    <div className="flex items-center gap-2 bg-blue-500/40 px-3 py-1.5 rounded-full animate-pulse">
      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
      <span className="text-blue-200 text-xs font-medium">Đang bật camera...</span>
    </div>
  )}
  ```

#### 📍 Nơi gọi ParticipantTile
- Thêm prop `cameraLoading={isSelf && cameraLoading}`

#### 🔧 Sửa `toggleCam()` Function
- Thêm `setCameraError(null)` trước `getLocalStream()`
- Better error logging

---

### 2. **CallRoom.jsx** (Full-screen Group Call)

#### ➕ Thêm State
```javascript
const [cameraLoading, setCameraLoading] = useState(false);
const [cameraError, setCameraError] = useState(null);
```

#### 🔄 Sửa `getLocalStream()` Function (Tương tự CallManager)
- Set/clear loading state
- Wrap getUserMedia trong try-finally
- Error handling với descriptive messages

#### 🎨 Sửa Tile Component
- Thêm prop `cameraLoading`
- Render loading indicator tương tự

#### 📍 Nơi gọi Tile
- Thêm `cameraLoading={isSelf && cameraLoading}`

#### 🔧 Sửa `toggleCam()` Function

---

### 3. **DirectCallRoom.jsx** (Full-screen 1-1 Call)

#### ➕ Thêm State
```javascript
const [cameraLoading, setCameraLoading] = useState(false);
const [cameraError, setCameraError] = useState(null);
```

#### 🔄 Sửa `getLocalStream()` Function (Tương tự)

#### 🎨 LocalPiP Container
- Thêm overlay khi loading:
  ```jsx
  {cameraLoading && camOn && !screenShare && (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
      <div className="flex flex-col items-center gap-1">
        <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" />
        <span className="text-blue-300 text-[10px] font-medium">Đang bật cam</span>
      </div>
    </div>
  )}
  ```

#### 🔧 Sửa `toggleCam()` Function

---

## 🎯 User Experience

### Before
- Click "Bật cam"  
- 2-3 giây màn hình đơ/lock  
- Permission dialog hiện (nhưng user không biết)  
- Dạo camera load lên hoặc error

### After ✨
- Click "Bật cam"  
- **Ngay lập tức**: "Đang bật camera..." text hiện (blue, animate)  
- Permission dialog hiện (user biết rõ)  
- Camera load → text disappear, video hiện
- Nếu error → show message "Bạn từ chối cấp quyền camera" etc.

---

## 📝 Error Messages

| Lỗi | Message |
|-----|---------|
| NotAllowedError | "Bạn từ chối cấp quyền camera" |
| Not FoundError | "Không tìm thấy camera" |
| NotReadableError | "Camera bị ứng dụng khác sử dụng" |
| Generic | "Không thể truy cập camera" |

---

## 🔍 Testing Checklist

- [ ] Click "Bật cam" → text "Đang bật camera..." hiện ngay
- [ ] Camera loading → text disappear, video show
- [ ] Deny permission → error message show
- [ ] Camera không tồn tại → error message show
- [ ] Toggle cam on/off → không lock UI
- [ ] 1-1 call: PiP corner shows loading state
- [ ] Group call: Tile shows loading state
- [ ] Inline (CallManager): Avatar area shows loading state

---

## 💾 Files Modified

1. `client/src/components/CallManager.jsx`
   - State: +2 (`cameraLoading`, `cameraError`)
   - Function: Modified `getLocalStream()` (error handling, loading state)
   - Component: Modified `ParticipantTile` (show loading text)
   - Handler: Modified `toggleCam()` (better error handling)

2. `client/src/pages/CallRoom.jsx`
   - State: +2
   - Function: Modified `getLocalStream()`
   - Component: Modified `Tile` (show loading text)
   - Handler: Modified `toggleCam()`

3. `client/src/pages/DirectCallRoom.jsx`
   - State: +2
   - Function: Modified `getLocalStream()`
   - Component: Modified local PiP container (show loading overlay)
   - Handler: Modified `toggleCam()`

---

## 🚀 Future Improvements

1. **Session Persistence Across Reload** (Mentioned in conversation summary but not implemented yet)
   - Save call session to sessionStorage BEFORE getUserMedia
   - On reload, check sessionStorage and auto-rejoin call
   - Prevents "mất trang call" issue

2. **Refactor getLocalStream** (Code consolidation)
   - Move to shared utility function
   - Import and use in all 3 components
   - Reduce code duplication

3. **Advanced Camera Controls**
   - Facetime-style camera flip animation
   - Quality auto-selection based on bandwidth
   - TURN server for P2P connectivity

---

## 📌 Related Documentation

- [CALL_LOGIC_ANALYSIS.md](./CALL_LOGIC_ANALYSIS.md) - Full call architecture
- [CALL_ERROR_DEBUG_QUICK_GUIDE.md](./CALL_ERROR_DEBUG_QUICK_GUIDE.md) - Debugging guide
- [callStorage.js](./client/src/lib/callStorage.js) - Session persistence helper
