const PRESENCE_KEY = 'presence:online_users';

export async function markUserOnline(redisClient, userId) {
  const newCount = await redisClient.hIncrBy(PRESENCE_KEY, userId, 1);
  return newCount === 1;
}

export async function markUserOffline(redisClient, userId) {
  const newCount = await redisClient.hIncrBy(PRESENCE_KEY, userId, -1);

  if (newCount <= 0) {
    await redisClient.hDel(PRESENCE_KEY, userId);
    return true;
  }

  return false;
}

export async function isUserOnline(redisClient, userId) {
  const count = await redisClient.hGet(PRESENCE_KEY, userId);
  return count !== null && Number(count) > 0;
}