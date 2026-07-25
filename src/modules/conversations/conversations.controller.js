import { createConversation, getUserConversations } from './conversations.service.js';
import { createConversationSchema } from './conversations.validation.js';

export async function createConversationController(req, res, next) {
  try {
    const data = createConversationSchema.parse(req.body);
    const userId = req.userId;

    const conversation = await createConversation(userId, data.participantIds, data.isGroup, data.name);
    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
}

export async function getUserConversationsController(req, res, next) {
  try {
    const userId = req.userId;
    const conversations = await getUserConversations(userId);
    res.status(200).json({ conversations });
  } catch (err) {
    next(err);
  }
}