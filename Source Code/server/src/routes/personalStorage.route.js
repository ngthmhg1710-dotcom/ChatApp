import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { listItems, createItem, getItem, deleteItem, updateItem } from '../controllers/personalStorage.controller.js';

const router = express.Router();

router.use(protect);

router.get('/', listItems);
router.post('/', createItem);
router.get('/:id', getItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);

export default router;
