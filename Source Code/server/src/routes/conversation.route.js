import express from 'express';
import { 
  createConversation,
  getConversations,
  getConversationById,
  createGroupConversation,
  updateGroup,
  addParticipant,
  removeParticipant,
  leaveGroup,
  deleteGroup,
  transferLeadership  // 👈 Thêm import mới
} from '../controllers/conversation.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.post('/', createConversation);
router.post('/group', createGroupConversation);
router.get('/', getConversations);
router.put('/:id', updateGroup);
router.get('/:id', getConversationById);
router.post('/:id/participants', addParticipant);
router.delete('/:id/participants/:userId', removeParticipant);
router.post('/:id/leave', leaveGroup);
router.delete('/:id', deleteGroup);

router.post('/:id/transfer-leadership', transferLeadership);

export default router;