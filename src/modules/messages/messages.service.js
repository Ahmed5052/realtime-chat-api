import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';

const DEFAULT_PAGE_SIZE = 20;

export async function getMessages(conversationId, userId, cursor) {
  const isParticipant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });

  if (!isParticipant) {
    throw new AppError('You are not a participant in this conversation', 403);
  }

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null, 
      ...(cursor && { createdAt: { lt: new Date(cursor) } }),
    },
    orderBy: { createdAt: 'desc' },
    take: DEFAULT_PAGE_SIZE,
  });

  const nextCursor =
    messages.length === DEFAULT_PAGE_SIZE
      ? messages[messages.length - 1].createdAt.toISOString()
      : null;

  return {
    messages,
    nextCursor,
  };
}

export async function sendMessage(conversationId, senderId, content) {
  const isParticipant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId: senderId },
    },
  });

  if (!isParticipant) {
    throw new AppError('You are not a participant in this conversation', 403);
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content,
    },
  });

  return message;
}
export async function editMessage(messageId, userId, newContent) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });

  if (!message || message.deletedAt) {
    throw new AppError('Message not found', 404);
  }

  if (message.senderId !== userId) {
    throw new AppError('You can only edit your own messages', 403);
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: {
      content: newContent,
      edited: true,
    },
  });

  return updated;
}

export async function deleteMessage(messageId, userId) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });

  if (!message || message.deletedAt) {
    throw new AppError('Message not found', 404);
  }

  if (message.senderId !== userId) {
    throw new AppError('You can only delete your own messages', 403);
  }

  const deleted = await prisma.message.update({
    where: { id: messageId },
    data: {
      deletedAt: new Date(),
      content: '', 
    },
  });

  return deleted;
}