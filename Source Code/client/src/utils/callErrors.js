/**
 * Call Error Types & Messages
 * Centralized error definitions for call failures
 */

export const CALL_ERROR_TYPES = {
  // Media errors
  MEDIA_NO_DEVICE: 'MEDIA_NO_DEVICE',
  MEDIA_PERMISSION_DENIED: 'MEDIA_PERMISSION_DENIED',
  MEDIA_NOT_READABLE: 'MEDIA_NOT_READABLE',
  MEDIA_OVERCONSTRAINED: 'MEDIA_OVERCONSTRAINED',
  MEDIA_GENERIC: 'MEDIA_GENERIC',

  // Screen share errors
  SCREEN_PERMISSION_DENIED: 'SCREEN_PERMISSION_DENIED',
  SCREEN_NOT_FOUND: 'SCREEN_NOT_FOUND',
  SCREEN_GENERIC: 'SCREEN_GENERIC',

  // WebRTC errors
  PC_CREATION_FAILED: 'PC_CREATION_FAILED',
  ICE_CONNECTION_FAILED: 'ICE_CONNECTION_FAILED',
  OFFER_CREATION_FAILED: 'OFFER_CREATION_FAILED',
  ANSWER_CREATION_FAILED: 'ANSWER_CREATION_FAILED',
  DESCRIPTION_FAILED: 'DESCRIPTION_FAILED',

  // Network errors
  SOCKET_DISCONNECTED: 'SOCKET_DISCONNECTED',
  SOCKET_AUTH_FAILED: 'SOCKET_AUTH_FAILED',
  NETWORK_UNREACHABLE: 'NETWORK_UNREACHABLE',

  // Call state errors
  CALL_NOT_FOUND: 'CALL_NOT_FOUND',
  CALL_ALREADY_ENDED: 'CALL_ALREADY_ENDED',
  PEER_TIMEOUT: 'PEER_TIMEOUT',
  CALLEE_REJECTED: 'CALLEE_REJECTED',

  // Navigation errors
  INVALID_CALL_ID: 'INVALID_CALL_ID',
  INVALID_CONVERSATION_ID: 'INVALID_CONVERSATION_ID',
  UNAUTHORIZED: 'UNAUTHORIZED',
};

export const CALL_ERRORS = {
  [CALL_ERROR_TYPES.MEDIA_NO_DEVICE]: {
    title: 'Không tìm thấy thiết bị',
    message: 'Camera hoặc microphone không có sẵn trên thiết bị này',
    hint: 'Kiểm tra dây nối của camera/microphone',
    severity: 'error',
  },

  [CALL_ERROR_TYPES.MEDIA_PERMISSION_DENIED]: {
    title: 'Cấp quyền bị từ chối',
    message: 'Bạn từ chối cấp quyền truy cập camera/microphone',
    hint: 'Vào Cài đặt trình duyệt → Quyền Site → Cấp lại quyền',
    severity: 'error',
  },

  [CALL_ERROR_TYPES.MEDIA_NOT_READABLE]: {
    title: 'Thiết bị đang bận',
    message: 'Camera/microphone đang được ứng dụng khác sử dụng',
    hint: 'Đóng các ứng dụng khác đang dùng camera/microphone',
    severity: 'error',
  },

  [CALL_ERROR_TYPES.MEDIA_OVERCONSTRAINED]: {
    title: 'Thiết bị không hỗ trợ',
    message: 'Thiết bị không đáp ứng yêu cầu cấu hình video',
    hint: 'Thử webcam hoặc máy tính khác',
    severity: 'warning',
  },

  [CALL_ERROR_TYPES.MEDIA_GENERIC]: {
    title: 'Lỗi truy cập media',
    message: 'Không thể truy cập camera hoặc microphone',
    hint: 'Tải lại trang và thử lại',
    severity: 'error',
  },

  [CALL_ERROR_TYPES.SCREEN_PERMISSION_DENIED]: {
    title: 'Chia sẻ màn hình bị từ chối',
    message: 'Bạn từ chối chia sẻ màn hình',
    hint: 'Chọn "Cho phép" khi được hỏi',
    severity: 'warning',
  },

  [CALL_ERROR_TYPES.SCREEN_NOT_FOUND]: {
    title: 'Không tìm thấy màn hình',
    message: 'Không thể chia sẻ màn hình',
    hint: 'Thử lại hoặc sử dụng cửa sổ khác',
    severity: 'warning',
  },

  [CALL_ERROR_TYPES.SCREEN_GENERIC]: {
    title: 'Lỗi chia sẻ màn hình',
    message: 'Không thể khởi động chia sẻ màn hình',
    hint: 'Tải lại trang và thử lại',
    severity: 'error',
  },

  [CALL_ERROR_TYPES.PC_CREATION_FAILED]: {
    title: 'Lỗi tạo kết nối',
    message: 'Không thể khởi tạo kết nối video',
    hint: 'Thử trình duyệt khác (Chrome, Firefox)',
    severity: 'error',
  },

  [CALL_ERROR_TYPES.ICE_CONNECTION_FAILED]: {
    title: 'Không thể kết nối (ICE)',
    message: 'Không thể thiết lập kết nối P2P',
    hint: 'Kiểm tra kết nối Internet, có thể là NAT/Firewall',
    severity: 'error',
  },

  [CALL_ERROR_TYPES.OFFER_CREATION_FAILED]: {
    title: 'Lỗi tạo offer',
    message: 'Không thể tạo yêu cầu gọi',
    hint: 'Tải lại trang và thử lại',
    severity: 'error',
  },

  [CALL_ERROR_TYPES.ANSWER_CREATION_FAILED]: {
    title: 'Lỗi tạo answer',
    message: 'Không thể chấp nhận cuộc gọi',
    hint: 'Tải lại trang và thử lại',
    severity: 'error',
  },

  [CALL_ERROR_TYPES.DESCRIPTION_FAILED]: {
    title: 'Lỗi thiết lập kết nối',
    message: 'Lỗi trong handshake kết nối',
    hint: 'Cố gắng cuộc gọi lại',
    severity: 'error',
  },

  [CALL_ERROR_TYPES.SOCKET_DISCONNECTED]: {
    title: 'Mất kết nối socket',
    message: 'Kết nối với server bị ngắt',
    hint: 'Kiểm tra kết nối Internet',
    severity: 'error',
  },

  [CALL_ERROR_TYPES.SOCKET_AUTH_FAILED]: {
    title: 'Lỗi xác thực',
    message: 'Không thể xác thực với server',
    hint: 'Đăng nhập lại',
    severity: 'error',
  },

  [CALL_ERROR_TYPES.NETWORK_UNREACHABLE]: {
    title: 'Mất kết nối mạng',
    message: 'Không thể kết nối đến server',
    hint: 'Kiểm tra WiFi/3G/4G, thử lại',
    severity: 'error',
  },

  [CALL_ERROR_TYPES.CALL_NOT_FOUND]: {
    title: 'Cuộc gọi không tìm thấy',
    message: 'Cuộc gọi đã kết thúc hoặc không tồn tại',
    hint: 'Quay lại chat và cố gắng gọi lại',
    severity: 'warning',
  },

  [CALL_ERROR_TYPES.CALL_ALREADY_ENDED]: {
    title: 'Cuộc gọi đã kết thúc',
    message: 'Người dùng khác đã đóng cửa cuộc gọi',
    hint: 'Cố gắng gọi lại',
    severity: 'info',
  },

  [CALL_ERROR_TYPES.PEER_TIMEOUT]: {
    title: 'Timeout kết nối peer',
    message: 'Không thể kết nối đến người dùng khác',
    hint: 'Kiểm tra NAT/Firewall, thử lại',
    severity: 'error',
  },

  [CALL_ERROR_TYPES.CALLEE_REJECTED]: {
    title: 'Cuộc gọi bị từ chối',
    message: 'Người dùng từ chối cuộc gọi',
    hint: 'Thử gọi lại sau',
    severity: 'info',
  },

  [CALL_ERROR_TYPES.INVALID_CALL_ID]: {
    title: 'ID cuộc gọi không hợp lệ',
    message: 'Đường link cuộc gọi không hợp lệ',
    hint: 'Quay lại và thử lại',
    severity: 'error',
  },

  [CALL_ERROR_TYPES.INVALID_CONVERSATION_ID]: {
    title: 'ID cuộc trò chuyện không hợp lệ',
    message: 'Cuộc trò chuyện không tồn tại',
    hint: 'Quay lại chat',
    severity: 'error',
  },

  [CALL_ERROR_TYPES.UNAUTHORIZED]: {
    title: 'Không được phép',
    message: 'Bạn không đủ quyền để tham gia cuộc gọi này',
    hint: 'Kiểm tra quyền trong cuộc trò chuyện',
    severity: 'error',
  },
};

/**
 * Get error info
 */
export const getCallError = (errorType) => {
  return CALL_ERRORS[errorType] || {
    title: 'Lỗi không xác định',
    message: 'Có lỗi xảy ra trong cuộc gọi',
    hint: 'Tải lại trang và thử lại',
    severity: 'error',
  };
};

/**
 * Map browser error to call error type
 */
export const mapMediaErrorToBrowserError = (err) => {
  if (!err) return CALL_ERROR_TYPES.MEDIA_GENERIC;

  switch (err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return CALL_ERROR_TYPES.MEDIA_PERMISSION_DENIED;
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return CALL_ERROR_TYPES.MEDIA_NO_DEVICE;
    case 'NotReadableError':
    case 'TrackStartError':
      return CALL_ERROR_TYPES.MEDIA_NOT_READABLE;
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return CALL_ERROR_TYPES.MEDIA_OVERCONSTRAINED;
    case 'SecurityError':
      return CALL_ERROR_TYPES.MEDIA_PERMISSION_DENIED;
    default:
      return CALL_ERROR_TYPES.MEDIA_GENERIC;
  }
};

/**
 * Map screen share error
 */
export const mapScreenErrorToCallError = (err) => {
  if (!err) return CALL_ERROR_TYPES.SCREEN_GENERIC;

  switch (err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return CALL_ERROR_TYPES.SCREEN_PERMISSION_DENIED;
    case 'NotFoundError':
      return CALL_ERROR_TYPES.SCREEN_NOT_FOUND;
    default:
      return CALL_ERROR_TYPES.SCREEN_GENERIC;
  }
};
