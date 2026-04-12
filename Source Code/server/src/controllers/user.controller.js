import User from '../models/user.model.js';

// Chuẩn hóa chuỗi: bỏ dấu tiếng Việt → dạng ASCII để so sánh không dấu
function removeAccents(str) {
  return str
    .normalize('NFD')                        // tách ký tự + dấu
    .replace(/[\u0300-\u036f]/g, '')         // xóa dấu
    .replace(/đ/g, 'd').replace(/Đ/g, 'D'); // đ không nằm trong NFD
}

// @desc    Search users by username or email (hỗ trợ tìm không dấu)
// @route   GET /api/users/search?q=query
// @access  Private
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 1 character',
      });
    }

    const raw        = q.trim();
    const normalized = removeAccents(raw);

    // Lấy tất cả user (trừ chính mình), sau đó filter phía Node
    // vì MongoDB không native hỗ trợ so sánh không dấu tiếng Việt.
    // Giới hạn pool 500 user để tránh load quá nhiều; với app nhỏ/vừa là đủ.
    const pool = await User.find({ _id: { $ne: req.user.id } })
      .select('username email avatar bio isOnline lastSeen')
      .limit(500)
      .lean();

    const lowerNorm = normalized.toLowerCase();

    const users = pool.filter(u => {
      const uName  = removeAccents(u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      return uName.includes(lowerNorm) || uEmail.includes(lowerNorm);
    }).slice(0, 20);

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username email avatar bio isOnline lastSeen createdAt');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};