import { Router } from 'express';
import { createConversationController, getUserConversationsController } from './conversations.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/', requireAuth, createConversationController);
router.get('/', requireAuth, getUserConversationsController);

export default router;