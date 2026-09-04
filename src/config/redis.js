import { createClient } from 'redis';
import { env } from './env.js';

export async function createRedisClients() {
  const pubClient = createClient({ url: env.redisUrl });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('Redis pub client error:', err));
  subClient.on('error', (err) => console.error('Redis sub client error:', err));

  await Promise.all([pubClient.connect(), subClient.connect()]);

  return { pubClient, subClient };
}