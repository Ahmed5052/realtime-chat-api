import { markUserOnline, markUserOffline } from '../presence.js';
import { prisma } from '../../config/database.js';

export async function registerPresenceHandlers(io, socket) {
  const justCameOnline = markUserOnline(socket.userId);

  if (justCameOnline) {
    await broadcastPresenceToUserConversations(io, socket.userId, 'presence:online');
  }

  socket.on('disconnect', async () => {
    const justWentOffline = markUserOffline(socket.userId);

    if (justWentOffline) {
      await broadcastPresenceToUserConversations(io, socket.userId, 'presence:offline');
    }
  });
}

async function broadcastPresenceToUserConversations(io, userId, eventName) {
  const participantRows = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true },
  });

  const roomIds = participantRows.map((row) => row.conversationId);

  if (roomIds.length === 0) return;

  io.to(roomIds).emit(eventName, { userId });
}