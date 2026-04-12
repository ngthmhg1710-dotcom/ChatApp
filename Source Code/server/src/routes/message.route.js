import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getMessages, uploadFile, searchMessages } from '../controllers/message.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ── FIX: Lưu file vào disk thay vì memory ─────────────────────────────────
// Đảm bảo thư mục uploads tồn tại
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Tạo tên file unique: timestamp + random + extension gốc
    const ext      = path.extname(file.originalname).toLowerCase();
    const safeName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    const unique   = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${unique}_${safeName}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Chấp nhận ảnh, video, và mọi loại file
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// Routes — /search phải đứng trước /:conversationId
router.get('/search', protect, searchMessages);
router.get('/:conversationId', protect, getMessages);
router.post('/upload', protect, upload.single('file'), uploadFile);

export default router;