import { Router } from 'express';
import {getMessagesController,sendMessageController,editMessageController,deleteMessageController} from './messages.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/:conversationId/messages', requireAuth, getMessagesController);
router.post('/:conversationId/messages', requireAuth, sendMessageController);
router.patch('/messages/:messageId', requireAuth, editMessageController);
router.delete('/messages/:messageId', requireAuth, deleteMessageController);

export default router;