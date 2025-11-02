import { configureStore } from '@reduxjs/toolkit';
import whiteboardReducer from './slices/whiteboardSlice';
import themeReducer from './slices/themeSlice';
import chatReducer from './slices/chatSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    whiteboard: whiteboardReducer,
    theme: themeReducer,
    chat: chatReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

