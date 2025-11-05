'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../src/store/hooks';
import { setRoomId } from '../src/store/slices/whiteboardSlice';
import Auth from '../src/components/Auth';
import WhiteboardList from '../src/components/WhiteboardList';

export default function Home() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isGuest, setIsGuest] = useState(false);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { roomId } = useAppSelector((state) => state.whiteboard);

  // Allow access if authenticated or guest mode
  const canAccess = isAuthenticated || isGuest;

  const handleGuestMode = () => {
    setIsGuest(true);
  };

  const handleSelectWhiteboard = (selectedRoomId: string) => {
    dispatch(setRoomId(selectedRoomId));
    router.push(`/${selectedRoomId}`);
  };

  // Generate 8-character room ID
  const generateRoomId = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let roomId = '';
    for (let i = 0; i < 8; i++) {
      roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return roomId;
  };

  // Auto-redirect guests to a room
  useEffect(() => {
    if (isGuest && !roomId) {
      const newRoomId = generateRoomId();
      router.push(`/${newRoomId}`);
    }
  }, [isGuest, roomId, router]);

  if (!canAccess) {
    return <Auth onGuestMode={handleGuestMode} />;
  }

  // Show whiteboard list if authenticated
  if (isAuthenticated) {
    return <WhiteboardList onSelectWhiteboard={handleSelectWhiteboard} />;
  }

  // Show loading for guests being redirected
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-600 dark:text-gray-400">Creating your room...</div>
    </div>
  );
}
