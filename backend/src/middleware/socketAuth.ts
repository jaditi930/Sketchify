import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  email?: string;
}

export const authenticateSocket = async (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
): Promise<void> => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      // Allow connection without auth (guest users)
      // They'll have random usernames
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
        userId: string;
      };

      const user = await User.findById(decoded.userId).select('-password');

      if (user) {
        socket.userId = String(user._id);
        socket.username = user.username;
        socket.email = user.email;
      }
    } catch (jwtError) {
      // Invalid token, but allow connection as guest
      console.warn('Invalid socket token:', jwtError);
    }

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

