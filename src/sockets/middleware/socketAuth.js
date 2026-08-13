import { verifyAccessToken } from '../../utils/tokens.js';

export function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const payload = verifyAccessToken(token);
    socket.userId = payload.sub;
    next();
  } catch (err) {
    next(new Error('Invalid or expired token : ' + err.message));
  }
}