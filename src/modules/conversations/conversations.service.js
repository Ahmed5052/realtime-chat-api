import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';

export async function createConversation(creatorId, participantIds, isGroup, name) {
  if (!isGroup && participantIds.length !== 1) {
    throw new AppError('A direct conversation must have exactly one other participant', 400);
  }

  if (isGroup && !name) {
    throw new AppError('Group conversations require a name', 400);
  }
  const allParticipantIds = [...new Set([creatorId, ...participantIds])];

  if (!isGroup) {
    const existing = await findExistingDirectConversation(allParticipantIds);
    if (existing) {
      return existing;
    }
  }

  const conversation = await prisma.conversation.create({
    data: {
      isGroup,
      name: isGroup ? name : null,
      participants: {
        create: allParticipantIds.map((userId) => ({ userId })),
      },
    },
    include: {
      participants: {
        include: { user: { select: { id: true, username: true, email: true } } },
      },
    },
  });

  return conversation;
}

async function findExistingDirectConversation(participantIds) {
  const conversations = await prisma.conversation.findMany({
    where: {
      isGroup: false,
      participants: {
        every: { userId: { in: participantIds } },
      },
    },
    include: { participants: true },
  });

  return conversations.find((c) => c.participants.length === participantIds.length) || null;
}

export async function getUserConversations(userId) {
  return prisma.conversation.findMany({
    where: {
      participants: { some: { userId } },
    },
    include: {
      participants: {
        include: { user: { select: { id: true, username: true, email: true } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}