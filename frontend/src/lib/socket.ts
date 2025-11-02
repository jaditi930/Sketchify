import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export const getSocket = (token?: string | null): Socket => {
  if (!socket) {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token: authToken,
      },
    });
  } else if (token) {
    // If token changed and socket is connected, reconnect with new token
    const currentToken = socket.handshake?.auth?.token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (currentToken !== token) {
      socket.disconnect();
      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        auth: {
          token: token,
        },
      });
    }
  }
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

