'use client';

import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setRoomId } from '../store/slices/whiteboardSlice';
import { logout } from '../store/slices/authSlice';
import { disconnectSocket } from '../lib/socket';
import {
  getWhiteboards,
  createWhiteboard,
  deleteWhiteboard,
  inviteCollaborator,
  type Whiteboard,
} from '../lib/whiteboards';

interface WhiteboardListProps {
  onSelectWhiteboard: (roomId: string) => void;
}

export default function WhiteboardList({ onSelectWhiteboard }: WhiteboardListProps) {
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);

  const { token, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (token) {
      loadWhiteboards();
    }
  }, [token]);

  const loadWhiteboards = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await getWhiteboards(token);
      setWhiteboards(data.whiteboards);
    } catch (err: any) {
      setError(err.message || 'Failed to load whiteboards');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!token) return;

    try {
      setError('');
      const data = await createWhiteboard('', true, token); // Auto-generate name, default to protected
      setWhiteboards([data.whiteboard, ...whiteboards]);
      // Automatically open the new whiteboard
      handleOpenWhiteboard(data.whiteboard.roomId);
    } catch (err: any) {
      setError(err.message || 'Failed to create whiteboard');
    }
  };

  const handleDelete = async (roomId: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this whiteboard?')) return;

    try {
      setError('');
      await deleteWhiteboard(roomId, token);
      setWhiteboards(whiteboards.filter((w) => w.roomId !== roomId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete whiteboard');
    }
  };


  const handleOpenWhiteboard = (roomId: string) => {
    dispatch(setRoomId(roomId));
    onSelectWhiteboard(roomId);
  };

  const handleCopyLink = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      // Show toast notification
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    dispatch(logout());
  };

  // Separate whiteboards into owned and shared
  const myWhiteboards = whiteboards.filter((w) => String(w.owner) === String(user?.id));
  const sharedWhiteboards = whiteboards.filter((w) => String(w.owner) !== String(user?.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading whiteboards...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="bg-white text-green-500 border border-green-500 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <span className="text-lg">✓</span>
            <span className="font-medium">Link copied to clipboard!</span>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Sketchify</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage and collaborate on your whiteboards</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium shadow-md hover:shadow-lg"
            >
              + New Whiteboard
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium shadow-md hover:shadow-lg"
              title="Logout"
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        {whiteboards.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">No whiteboards yet</p>
            <p className="text-gray-500 dark:text-gray-500 mb-6">Create your first whiteboard to get started</p>
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
            >
              + Create Whiteboard
            </button>
          </div>
        ) : (
          <>
            {/* My Whiteboards Section */}
            {myWhiteboards.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">My Whiteboards</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {myWhiteboards.map((whiteboard) => (
                    <div
                      key={whiteboard.roomId}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700 flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate mb-1">
                            {whiteboard.name}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {whiteboard.isProtected && (
                              <span className="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-full">
                                🔒 Private
                              </span>
                            )}
                            {!whiteboard.isProtected && (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                                🌐 Public
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {whiteboard.collaborators.length > 0 && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            👥 {whiteboard.collaborators.length} collaborator{whiteboard.collaborators.length !== 1 ? 's' : ''}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                          Updated {new Date(whiteboard.updatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-auto">
                        <button
                          onClick={() => handleOpenWhiteboard(whiteboard.roomId)}
                          className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow cursor-pointer"
                        >
                          Open
                        </button>
                        <button
                          onClick={(e) => handleCopyLink(whiteboard.roomId, e)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                          title="Copy Link"
                        >
                          🔗
                        </button>
                        <button
                          onClick={() => handleDelete(whiteboard.roomId)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shared Whiteboards Section */}
            {sharedWhiteboards.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Shared Whiteboards</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {sharedWhiteboards.map((whiteboard) => (
                    <div
                      key={whiteboard.roomId}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700 flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate mb-1">
                            {whiteboard.name}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {whiteboard.isProtected && (
                              <span className="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-full">
                                🔒 Private
                              </span>
                            )}
                            {!whiteboard.isProtected && (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                                🌐 Public
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          <span>Collaborator</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                          Updated {new Date(whiteboard.updatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-auto">
                        <button
                          onClick={() => handleOpenWhiteboard(whiteboard.roomId)}
                          className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow cursor-pointer"
                        >
                          Open
                        </button>
                        <button
                          onClick={(e) => handleCopyLink(whiteboard.roomId, e)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                          title="Copy Link"
                        >
                          🔗
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

