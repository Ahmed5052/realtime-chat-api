export function registerTypingHandlers(io, socket) {
  socket.on('typing:start', (payload) => {
    const { conversationId } = payload;

    if (!conversationId) return;

    socket.to(conversationId).emit('typing:start', {
      conversationId,
      userId: socket.userId,
    });
  });

  socket.on('typing:stop', (payload) => {
    const { conversationId } = payload;

    if (!conversationId) return;

    socket.to(conversationId).emit('typing:stop', {
      conversationId,
      userId: socket.userId,
    });
  });
}