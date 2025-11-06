'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { setRoomId, clearStrokes, setWhiteboardOwner } from '../../src/store/slices/whiteboardSlice';
import { getWhiteboard } from '../../src/lib/whiteboards';
import Whiteboard from '../../src/components/Whiteboard';
import Toolbar from '../../src/components/Toolbar';
import Chat from '../../src/components/Chat';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, token, user } = useAppSelector((state) => state.auth);
  const { whiteboardOwner } = useAppSelector((state) => state.whiteboard);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState('');

  const checkAccess = useCallback(async (roomId: string) => {
    try {
      setIsLoading(true);
      setError('');
      
      const data = await getWhiteboard(roomId, token!);
      setHasAccess(true);
      
      // Store whiteboard owner in Redux
      dispatch(setWhiteboardOwner(data.whiteboard.owner));
      
      // Check if user has edit access
      if (user) {
        const canEdit = 
          !data.whiteboard.isProtected ||
          String(data.whiteboard.owner) === String(user.id) ||
          data.whiteboard.collaborators.some((c: any) => c.userId === user.id);
        
        if (!canEdit) {
          setError('You do not have access to edit this protected whiteboard');
        }
      }
    } catch (err: any) {
      console.error('Access check error:', err);
      if (err.message.includes('403') || err.message.includes('do not have access')) {
        setError('You do not have access to this whiteboard');
        setHasAccess(false);
      } else if (err.message.includes('404')) {
        // Whiteboard doesn't exist, allow access but will be created
        // If authenticated user, they will be the owner when socket creates it
        if (user) {
          dispatch(setWhiteboardOwner(user.id));
        } else {
          // For guest-created whiteboards, owner will be set to 'guest' by socket
          dispatch(setWhiteboardOwner('guest'));
        }
        setHasAccess(true);
      } else {
        setError('Failed to load whiteboard');
        setHasAccess(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, user, dispatch]);

  useEffect(() => {
    const roomId = params.roomId as string;
    if (!roomId) return;

    dispatch(setRoomId(roomId));

    // If authenticated, check access to the whiteboard
    if (isAuthenticated && token) {
      checkAccess(roomId);
    } else {
      // Guest users can access any room (will be validated on socket level)
      // For guest-created whiteboards, owner will be set to 'guest' by socket
      // Set owner to 'guest' initially to hide chat/settings
      dispatch(setWhiteboardOwner('guest'));
      setHasAccess(true);
      setIsLoading(false);
    }

    // Listen for socket errors
    const handleSocketError = (event: any) => {
      if (event.detail?.message) {
        setError(event.detail.message);
        if (event.detail.message.includes('do not have access')) {
          setHasAccess(false);
        }
      }
    };

    window.addEventListener('socket-error', handleSocketError);
    return () => window.removeEventListener('socket-error', handleSocketError);
  }, [params.roomId, isAuthenticated, token, dispatch, checkAccess]);

  const handleBackToList = () => {
    dispatch(clearStrokes());
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading whiteboard...</div>
      </div>
    );
  }

  if (error && !hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4 text-center">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
            {error}
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }
  
  // Determine if chat should be shown
  // Hide chat if:
  // 1. User is not authenticated (guest), OR
  // 2. Whiteboard owner is 'guest'
  const shouldShowChat = isAuthenticated && whiteboardOwner !== 'guest' && whiteboardOwner !== null;

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <Toolbar onBackToList={isAuthenticated ? handleBackToList : undefined} />
      <div className="pt-16 h-full">
        <Whiteboard />
      </div>
      {shouldShowChat && <Chat />}
    </main>
  );
}

