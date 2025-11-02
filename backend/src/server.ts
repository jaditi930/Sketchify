import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import { setupWhiteboardSocket } from './socket/whiteboardSocket';
import { setupChatSocket } from './socket/chatSocket';
import authRoutes from './routes/auth';
import whiteboardRoutes from './routes/whiteboards';
import { authenticateSocket } from './middleware/socketAuth';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket authentication middleware
io.use(authenticateSocket);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/whiteboards', whiteboardRoutes);

// Setup Socket.IO
setupWhiteboardSocket(io);
setupChatSocket(io);

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default httpServer;

