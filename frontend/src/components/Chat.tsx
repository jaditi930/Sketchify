'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addMessage,
  setMessages,
  setUsername,
  setChatConnected,
} from '../store/slices/chatSlice';
import { getSocket } from '../lib/socket';
import type { ChatMessage } from '../store/slices/chatSlice';

export default function Chat() {
  const dispatch = useAppDispatch();
  const { messages, username, isConnected } = useAppSelector((state) => state.chat);
  const { roomId, userId } = useAppSelector((state) => state.whiteboard);
  const { user: authUser, token } = useAppSelector((state) => state.auth);
  
  // Use authenticated username if available, otherwise use chat username
  const displayUsername = authUser?.username || username;
  const currentUserId = authUser?.id || userId || 'unknown';
  const [inputMessage, setInputMessage] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!roomId) return;

    const socket = getSocket();

    const joinChatRoom = () => {
      if (socket.connected && roomId) {
        socket.emit('join-chat-room', roomId);
      }
    };

    socket.on('connect', () => {
      dispatch(setChatConnected(true));
      joinChatRoom();
    });

    socket.on('disconnect', () => {
      dispatch(setChatConnected(false));
    });

    socket.on('chat-history', (history: ChatMessage[]) => {
      dispatch(setMessages(history));
    });

    socket.on('new-message', (message: ChatMessage) => {
      dispatch(addMessage(message));
    });

    socket.on('error', (error: { message: string }) => {
      console.error('Chat error:', error);
    });

    // Join if already connected
    if (socket.connected) {
      joinChatRoom();
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('chat-history');
      socket.off('new-message');
      socket.off('error');
      if (roomId) {
        socket.emit('leave-chat-room', roomId);
      }
    };
  }, [roomId, dispatch]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !roomId || !isConnected) return;

    const socket = getSocket(token);
    socket.emit('send-message', {
      roomId,
      userId: authUser?.id || userId || 'unknown',
      username: displayUsername,
      message: inputMessage.trim(),
    });

    setInputMessage('');
    inputRef.current?.focus();
  };

  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all hover:scale-110"
        title="Open Chat"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 h-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <h3 className="font-semibold text-gray-900 dark:text-white">Chat</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = String(msg.userId) === String(currentUserId);
            
            return (
              <div
                key={msg._id || `${msg.timestamp}-${msg.userId}`}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex flex-col gap-1 max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                  {!isOwnMessage && (
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 px-1">
                      {msg.username}
                    </span>
                  )}
                  <div
                    className={`text-sm break-words rounded-lg px-3 py-2 shadow-sm ${
                      isOwnMessage
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 px-1">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={!isConnected}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || !isConnected}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

