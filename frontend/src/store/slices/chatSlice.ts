import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ChatMessage {
  _id?: string;
  roomId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date | string;
}

interface ChatState {
  messages: ChatMessage[];
  username: string;
  isConnected: boolean;
}

const initialState: ChatState = {
  messages: [],
  username: `User${Math.floor(Math.random() * 1000)}`,
  isConnected: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setMessages: (state, action: PayloadAction<ChatMessage[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    setUsername: (state, action: PayloadAction<string>) => {
      state.username = action.payload;
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
  },
});

export const {
  setMessages,
  addMessage,
  clearMessages,
  setUsername,
  setConnected: setChatConnected,
} = chatSlice.actions;

export default chatSlice.reducer;

