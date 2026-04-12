import express from 'express';
import {
  register, login, getMe, updateProfile, verifyEmail, changePassword
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { forgotPassword, resetPassword } from "../controllers/auth.controller.js";
const router = express.Router();

router.post('/register',         register);
router.post('/login',            login);
router.get('/me',                protect, getMe);
router.put('/profile',           protect, updateProfile);
router.put('/change-password',   protect, changePassword);
router.get('/verify/:token',     verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
export default router;