import { Server } from 'socket.io';
import Whiteboard, { IWhiteboard } from '../models/Whiteboard';
import { AuthenticatedSocket } from '../middleware/socketAuth';

interface DrawingStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  timestamp: number;
  userId: string;
  tool?: 'pen' | 'eraser' | 'highlighter';
  shape?: 'freehand' | 'line' | 'rectangle' | 'square' | 'circle';
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
}

// Helper function to check if user can edit
const canEdit = (whiteboard: any, userId: string | undefined): boolean => {
  if (!whiteboard.isProtected) return true; // Public whiteboards can be edited by anyone
  
  if (!userId) return false; // Guests cannot edit protected whiteboards
  
  return (
    whiteboard.owner === userId ||
    whiteboard.collaborators.some((c: any) => c.userId === userId)
  );
};

export const setupWhiteboardSocket = (io: Server): void => {
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId || socket.id;
    const username = socket.username || `Guest${socket.id.slice(0, 6)}`;
    console.log(`User connected: ${socket.id} (${username})`);

    // Join a room
    socket.on('join-room', async (roomId: string) => {
      console.log(`User ${socket.id} attempting to join room ${roomId}`);

      // Load existing whiteboard data
      try {
        const whiteboard = await Whiteboard.findOne({ roomId });
        if (whiteboard) {
          // Check if user has access to view this whiteboard
          const hasViewAccess = 
            !whiteboard.isProtected || // Public whiteboards
            socket.userId && (
              whiteboard.owner === socket.userId ||
              whiteboard.collaborators.some((c: any) => c.userId === socket.userId)
            );

          if (!hasViewAccess) {
            socket.emit('error', { message: 'You do not have access to this protected whiteboard' });
            console.log(`User ${socket.id} denied access to protected whiteboard ${roomId}`);
            return;
          }

          const hasEditAccess = canEdit(whiteboard, socket.userId);
          
          socket.join(roomId);
          console.log(`User ${socket.id} joined room ${roomId}`);
          
          socket.emit('whiteboard-loaded', {
            strokes: whiteboard.strokes,
            roomId: whiteboard.roomId,
            name: whiteboard.name,
            isProtected: whiteboard.isProtected,
            canEdit: hasEditAccess,
          });
        } else {
          // Whiteboard doesn't exist - create it for anyone (guests or authenticated users)
          // Default name is the roomId
          const newWhiteboard = new Whiteboard({
            roomId,
            name: roomId,
            owner: socket.userId || 'guest', // Use 'guest' for non-authenticated users
            isProtected: false, // All auto-created rooms are public by default
            collaborators: [],
            strokes: [],
          });
          await newWhiteboard.save();
          
          socket.join(roomId);
          console.log(`${socket.userId ? 'User' : 'Guest'} ${socket.id} created and joined room ${roomId}`);
          
          socket.emit('whiteboard-loaded', {
            strokes: [],
            roomId,
            name: newWhiteboard.name,
            isProtected: false,
            canEdit: true,
          });
        }
      } catch (error) {
        console.error('Error loading whiteboard:', error);
        socket.emit('error', { message: 'Failed to load whiteboard' });
        return;
      }

      // Notify others in the room
      socket.to(roomId).emit('user-joined', { userId: socket.id });
    });

    // Handle drawing strokes
    socket.on('draw-stroke', async (data: DrawingStroke & { roomId: string }) => {
      const { roomId, ...stroke } = data;

      try {
        const whiteboard = await Whiteboard.findOne({ roomId });
        if (!whiteboard) {
          socket.emit('error', { message: 'Whiteboard not found' });
          return;
        }

        // Check if user can edit
        if (!canEdit(whiteboard, socket.userId)) {
          socket.emit('error', { message: 'You do not have permission to edit this whiteboard' });
          return;
        }

        whiteboard.strokes.push(stroke);
        whiteboard.updatedAt = new Date();
        await whiteboard.save();

        // Broadcast to all clients in the room except sender
        socket.to(roomId).emit('stroke-drawn', stroke);
      } catch (error) {
        console.error('Error saving stroke:', error);
        socket.emit('error', { message: 'Failed to save stroke' });
      }
    });

    // Handle clearing whiteboard
    socket.on('clear-whiteboard', async (roomId: string) => {
      try {
        const whiteboard = await Whiteboard.findOne({ roomId });
        if (!whiteboard) {
          socket.emit('error', { message: 'Whiteboard not found' });
          return;
        }

        // Check if user can edit
        if (!canEdit(whiteboard, socket.userId)) {
          socket.emit('error', { message: 'You do not have permission to clear this whiteboard' });
          return;
        }

        whiteboard.strokes = [];
        whiteboard.updatedAt = new Date();
        await whiteboard.save();

        // Broadcast clear to all clients in the room
        io.to(roomId).emit('whiteboard-cleared');
      } catch (error) {
        console.error('Error clearing whiteboard:', error);
        socket.emit('error', { message: 'Failed to clear whiteboard' });
      }
    });

    // Handle undo (remove last stroke)
    socket.on('undo-stroke', async (roomId: string) => {
      try {
        const whiteboard = await Whiteboard.findOne({ roomId });
        if (!whiteboard) {
          socket.emit('error', { message: 'Whiteboard not found' });
          return;
        }

        // Check if user can edit
        if (!canEdit(whiteboard, socket.userId)) {
          socket.emit('error', { message: 'You do not have permission to undo on this whiteboard' });
          return;
        }

        if (whiteboard.strokes.length === 0) {
          socket.emit('error', { message: 'No strokes to undo' });
          return;
        }

        // Get the last stroke before removing it
        const removedStroke = whiteboard.strokes[whiteboard.strokes.length - 1];
        
        // Use MongoDB $pop operator via updateOne for atomic operation
        await Whiteboard.updateOne(
          { roomId },
          { $pop: { strokes: 1 }, $set: { updatedAt: new Date() } }
        );

        // Broadcast undo to all clients in the room (including sender)
        io.to(roomId).emit('stroke-undone', {
          strokeId: removedStroke?.id,
        });
      } catch (error) {
        console.error('Error undoing stroke:', error);
        socket.emit('error', { message: 'Failed to undo stroke' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

