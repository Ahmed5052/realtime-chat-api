import { createServer } from 'node:http';
import app from './app.js';
import { env } from './config/env.js';
import { disconnectDatabase } from './config/database.js';
import { initSocketServer } from './sockets/index.js';

const httpServer = createServer(app);

initSocketServer(httpServer);

httpServer.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await disconnectDatabase();
  httpServer.close(() => process.exit(0));
});