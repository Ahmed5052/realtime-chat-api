const onlineUsers = new Map();

export function markUserOnline(userId) {
  const currentCount = onlineUsers.get(userId) || 0;
  onlineUsers.set(userId, currentCount + 1);

  return currentCount === 0;
}

export function markUserOffline(userId) {
  const currentCount = onlineUsers.get(userId) || 0;

  if (currentCount <= 1) {
    onlineUsers.delete(userId);
    return true;
  }

  onlineUsers.set(userId, currentCount - 1);
  return false;
}

export function isUserOnline(userId) {
  return onlineUsers.has(userId);
}