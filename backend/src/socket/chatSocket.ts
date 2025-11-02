import { Server } from 'socket.io';
import ChatMessage, { IChatMessage } from '../models/Chat';
import { AuthenticatedSocket } from '../middleware/socketAuth';

interface MessageData {
  roomId: string;
  userId: string;
  username: string;
  message: string;
}

export const setupChatSocket = (io: Server): void => {
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId || socket.id;
    const username = socket.username || `Guest${socket.id.slice(0, 6)}`;
    // Handle joining chat room
    socket.on('join-chat-room', async (roomId: string) => {
      socket.join(`chat-${roomId}`);
      console.log(`User ${socket.id} joined chat room ${roomId}`);

      // Load recent chat messages (last 50 messages)
      try {
        const messages = await ChatMessage.find({ roomId })
          .sort({ timestamp: -1 })
          .limit(50)
          .lean();

        // Reverse to show oldest first
        socket.emit('chat-history', messages.reverse());
      } catch (error) {
        console.error('Error loading chat history:', error);
        socket.emit('error', { message: 'Failed to load chat history' });
      }
    });

    // Handle sending a message
    socket.on('send-message', async (data: MessageData) => {
      try {
        const { roomId, userId, username, message } = data;

        // Validate message
        if (!message || !message.trim()) {
          socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }

        // Use authenticated username if available, otherwise use provided username
        const senderUsername = socket.username || username || `Guest${userId.slice(0, 6)}`;
        const senderUserId = socket.userId || userId;

        // Create and save message
        const chatMessage = new ChatMessage({
          roomId,
          userId: senderUserId,
          username: senderUsername,
          message: message.trim(),
          timestamp: new Date(),
        });

        const savedMessage = await chatMessage.save();

        // Broadcast to all clients in the chat room
        io.to(`chat-${roomId}`).emit('new-message', {
          _id: String(savedMessage._id),
          roomId: savedMessage.roomId,
          userId: savedMessage.userId,
          username: savedMessage.username,
          message: savedMessage.message,
          timestamp: savedMessage.timestamp,
        });
      } catch (error) {
        console.error('Error saving message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle leaving chat room
    socket.on('leave-chat-room', (roomId: string) => {
      socket.leave(`chat-${roomId}`);
      console.log(`User ${socket.id} left chat room ${roomId}`);
    });
  });
};

