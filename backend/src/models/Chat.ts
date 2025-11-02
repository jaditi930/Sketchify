import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  roomId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
}

const ChatMessageSchema: Schema = new Schema(
  {
    roomId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    username: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying by roomId and timestamp
ChatMessageSchema.index({ roomId: 1, timestamp: -1 });

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

