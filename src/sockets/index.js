import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createRedisClients } from '../config/redis.js';
import { socketAuthMiddleware } from './middleware/socketAuth.js';
import { registerMessageHandlers } from './handlers/message.handler.js';
import { registerTypingHandlers } from './handlers/typing.handler.js';
import { registerPresenceHandlers } from './handlers/presence.handler.js';

export async function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  const { pubClient, subClient } = await createRedisClients();
  io.adapter(createAdapter(pubClient, subClient));

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    console.log(`Socket connected: userId=${socket.userId}`);

    registerMessageHandlers(io, socket);
    registerTypingHandlers(io, socket);
    registerPresenceHandlers(io, socket, pubClient); // pass Redis client through

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: userId=${socket.userId}`);
    });
  });

  return io;
}