'use client';

import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setWhiteboardName } from '../store/slices/whiteboardSlice';
import {
  getWhiteboard,
  updateWhiteboard,
  inviteCollaborator,
  removeCollaborator,
  deleteWhiteboard,
  type Whiteboard,
} from '../lib/whiteboards';

interface WhiteboardSettingsProps {
  roomId: string;
  onClose: () => void;
  onUpdate: () => void;
  onDelete?: () => void;
}

export default function WhiteboardSettings({
  roomId,
  onClose,
  onUpdate,
  onDelete,
}: WhiteboardSettingsProps) {
  const [whiteboard, setWhiteboard] = useState<Whiteboard | null>(null);
  const [name, setName] = useState('');
  const [isProtected, setIsProtected] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const { token, user } = useAppSelector((state) => state.auth);
  const { whiteboardOwner } = useAppSelector((state) => state.whiteboard);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (token && roomId) {
      loadWhiteboard();
    }
    // Trigger fade-in animation
    setTimeout(() => setIsVisible(true), 10);
  }, [token, roomId]);

  const loadWhiteboard = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await getWhiteboard(roomId, token);
      setWhiteboard(data.whiteboard);
      setName(data.whiteboard.name);
      setIsProtected(data.whiteboard.isProtected);
    } catch (err: any) {
      setError(err.message || 'Failed to load whiteboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !whiteboard) return;

    try {
      setError('');
      await updateWhiteboard(roomId, name.trim(), isProtected, token);
      await loadWhiteboard();
      // Update whiteboard name in Redux store
      dispatch(setWhiteboardName(name.trim()));
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to update whiteboard');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !inviteEmail.trim()) return;

    try {
      setError('');
      await inviteCollaborator(roomId, inviteEmail.trim(), token);
      await loadWhiteboard();
      setInviteEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to invite collaborator');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!token || !confirm('Remove this collaborator?')) return;

    try {
      setError('');
      await removeCollaborator(roomId, collaboratorId, token);
      await loadWhiteboard();
    } catch (err: any) {
      setError(err.message || 'Failed to remove collaborator');
    }
  };

  const handleDeleteWhiteboard = async () => {
    if (!token || !confirm('Are you sure you want to delete this whiteboard? This action cannot be undone.')) return;

    try {
      setError('');
      await deleteWhiteboard(roomId, token);
      if (onDelete) {
        onDelete();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete whiteboard');
    }
  };

  if (loading || !whiteboard) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ${
        isVisible ? 'bg-black/50 dark:bg-black/70 opacity-100' : 'bg-transparent opacity-0'
      }`}>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
          <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  // Ensure both are strings for comparison
  // Debug: Log the values to help identify the issue
  console.log('Ownership Check:', {
    whiteboardOwner: whiteboard.owner,
    whiteboardOwnerType: typeof whiteboard.owner,
    whiteboardOwnerStr: String(whiteboard.owner),
    userId: user?.id,
    userIdType: typeof user?.id,
    userIdStr: String(user?.id),
    match: String(whiteboard.owner) === String(user?.id),
  });

  // Check if whiteboard was created by guest or if current user is not the owner
  const isGuestCreated = whiteboard.owner === 'guest' || whiteboardOwner === 'guest';
  const isOwner = !isGuestCreated && user && String(whiteboard.owner) === String(user.id);
  
  // If whiteboard was created by guest, don't show settings
  if (isGuestCreated) {
    return (
      <div 
        className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
          isVisible ? 'bg-black/50 dark:bg-black/70 opacity-100' : 'bg-transparent opacity-0'
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl shadow-xl transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Whiteboard Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Settings are not available for whiteboards created by guest users.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
        isVisible ? 'bg-black/50 dark:bg-black/70 opacity-100' : 'bg-transparent opacity-0'
      }`}
      onClick={(e) => {
        // Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl transition-all duration-300 ${
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Whiteboard Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        {isOwner ? (
          <>
            {/* Name Update */}
            <form onSubmit={handleUpdate} className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Whiteboard Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Whiteboard name"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Save Name
                </button>
              </div>
            </form>

            {/* Protection Settings */}
            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                <input
                  type="checkbox"
                  checked={isProtected}
                  onChange={(e) => setIsProtected(e.target.checked)}
                  className="w-4 h-4"
                />
                Protected (Only collaborators can edit)
              </label>
              <form onSubmit={handleUpdate} className="inline">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                >
                  Save Protection Settings
                </button>
              </form>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {isProtected
                  ? 'Only you and invited collaborators can edit this whiteboard'
                  : 'Anyone with access to this whiteboard can edit it'}
              </p>
            </div>

            {/* Collaborators */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Collaborators ({whiteboard.collaborators.length})
              </h3>

              {/* Invite Form */}
              <form onSubmit={handleInvite} className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Enter email to invite"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                  >
                    Invite
                  </button>
                </div>
              </form>

              {/* Collaborator List */}
              {whiteboard.collaborators.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No collaborators yet</p>
              ) : (
                <div className="space-y-2">
                  {whiteboard.collaborators.map((collab) => (
                    <div
                      key={collab.userId}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{collab.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{collab.email}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveCollaborator(collab.userId)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delete Whiteboard */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">
                Danger Zone
              </h3>
              <button
                onClick={handleDeleteWhiteboard}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete Whiteboard
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Permanently delete this whiteboard and all its content. This cannot be undone.
              </p>
            </div>
          </>
        ) : 
        (
          <div>
            <p className="text-gray-600 dark:text-gray-400">
              You are a collaborator on this whiteboard. Only the owner can change settings.
            </p>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Whiteboard Name:</p>
              <p className="text-gray-900 dark:text-white">{whiteboard.name}</p>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</p>
              <p className="text-gray-900 dark:text-white">
                {whiteboard.isProtected ? 'Protected' : 'Public'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

