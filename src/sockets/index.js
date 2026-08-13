import { Server } from 'socket.io';
import { socketAuthMiddleware } from './middleware/socketAuth.js';
import { registerMessageHandlers } from './handlers/message.handler.js';
import { registerTypingHandlers } from './handlers/typing.handler.js';
import { registerPresenceHandlers } from './handlers/presence.handler.js';

export function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*'
    },
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    console.log(`Socket connected: userId=${socket.userId}`);

    registerMessageHandlers(io, socket);
    registerTypingHandlers(io, socket);
    registerPresenceHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: userId=${socket.userId}`);
    });
  });

  return io;
}