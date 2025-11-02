import mongoose, { Schema, Document } from 'mongoose';

export interface IWhiteboard extends Document {
  roomId: string;
  name: string;
  owner: string; // User ID of the owner
  isProtected: boolean; // If true, only collaborators can edit
  collaborators: Array<{
    userId: string;
    email: string;
    username: string;
    invitedAt: Date;
  }>;
  strokes: Array<{
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
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const WhiteboardSchema: Schema = new Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: 'Untitled Whiteboard' },
    owner: { type: String, required: true, index: true },
    isProtected: { type: Boolean, default: false },
    collaborators: [
      {
        userId: { type: String, required: true },
        email: { type: String, required: true },
        username: { type: String, required: true },
        invitedAt: { type: Date, default: Date.now },
      },
    ],
    strokes: [
      {
        id: String,
        points: [{ x: Number, y: Number }],
        color: String,
        width: Number,
        timestamp: Number,
        userId: String,
        tool: { type: String, enum: ['pen', 'eraser', 'highlighter'], required: false },
        shape: { type: String, enum: ['freehand', 'line', 'rectangle', 'square', 'circle'], required: false },
        startPoint: { x: { type: Number, required: false }, y: { type: Number, required: false } },
        endPoint: { x: { type: Number, required: false }, y: { type: Number, required: false } },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for querying whiteboards by owner
WhiteboardSchema.index({ owner: 1, createdAt: -1 });

export default mongoose.model<IWhiteboard>('Whiteboard', WhiteboardSchema);

