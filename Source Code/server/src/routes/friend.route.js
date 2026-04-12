import express from 'express';
import {
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getFriends,
  removeFriend,
  blockUser,
  unblockUser,
  getBlockStatus,
} from '../controllers/friend.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.post('/request/:userId',          sendFriendRequest);
router.delete('/request/:userId',        cancelFriendRequest);   // ✅ hủy lời mời đã gửi
router.post('/accept/:requestId',        acceptFriendRequest);
router.post('/reject/:requestId',        rejectFriendRequest);
router.get('/requests',                  getFriendRequests);
router.get('/',                          getFriends);
router.delete('/:friendId',             removeFriend);
router.post('/block/:userId',            blockUser);
router.delete('/block/:userId',          unblockUser);
router.get('/block-status/:userId',      getBlockStatus);

export default router;