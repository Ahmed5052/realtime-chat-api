import { prisma } from '../../config/database.js';
import { sendMessage } from '../../modules/messages/messages.service.js';
import {sendMessageSchema} from '../../modules/messages/messages.validation.js'

export function registerMessageHandlers(io, socket) {
  joinUserConversationRooms(socket);

  socket.on('message:send', async (payload, callback) => {
    try {
      const {conversationId} = payload
      const {content} = sendMessageSchema.parse(payload);

      const message = await sendMessage(conversationId, socket.userId, content);

      io.to(conversationId).emit('message:receive', message);
      if (callback) callback({ success: true, message });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });
}

async function joinUserConversationRooms(socket) {
  const participantRows = await prisma.conversationParticipant.findMany({
    where: { userId: socket.userId },
    select: { conversationId: true },
  });

  participantRows.forEach((row) => {
    socket.join(row.conversationId);
  });
}