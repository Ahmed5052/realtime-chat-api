import { getMessages, sendMessage ,editMessage,deleteMessage} from './messages.service.js';
import { getMessagesQuerySchema, sendMessageSchema, editMessageSchema } from './messages.validation.js';

export async function getMessagesController(req, res, next) {
  try {
    const { conversationId } = req.params;
    const {cursor} = getMessagesQuerySchema.parse(req.query);
    const userId = req.userId;

    const result = await getMessages(conversationId, userId, cursor);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function sendMessageController(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { content } = sendMessageSchema.parse(req.body);
    const userId = req.userId;

    const message = await sendMessage(conversationId, userId, content);
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
}

export async function editMessageController(req, res, next) {
  try {
    const { messageId } = req.params;
    const { content } = editMessageSchema.parse(req.body);
    const userId = req.userId;

    const message = await editMessage(messageId, userId, content);
    res.status(200).json({ message });
  } catch (err) {
    next(err);
  }
}

export async function deleteMessageController(req, res, next) {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    await deleteMessage(messageId, userId);
    res.status(204).send(); 
  } catch (err) {
    next(err);
  }
}