'use client';

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setColor, setLineWidth, clearStrokes, setTool, setShape, ToolType, ShapeType } from '../store/slices/whiteboardSlice';
import { logout } from '../store/slices/authSlice';
import { getSocket, disconnectSocket } from '../lib/socket';
import { toggleTheme } from '../store/slices/themeSlice';
import WhiteboardSettings from './WhiteboardSettings';

interface ToolbarProps {
  onBackToList?: () => void;
  onUpdate?: () => void;
}

export default function Toolbar({ onBackToList, onUpdate }: ToolbarProps) {
  const dispatch = useAppDispatch();
  const { color, lineWidth, roomId, whiteboardName, isConnected, tool, shape } = useAppSelector((state) => state.whiteboard);
  const { theme } = useAppSelector((state) => state.theme);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const tools: { type: ToolType; icon: string; label: string }[] = [
    { type: 'pen', icon: '✏️', label: 'Pen' },
    { type: 'eraser', icon: '🧹', label: 'Eraser' },
    { type: 'highlighter', icon: '🖍️', label: 'Highlighter' },
  ];

  const shapes: { type: ShapeType; icon: string; label: string }[] = [
    { type: 'freehand', icon: '✍️', label: 'Freehand' },
    { type: 'line', icon: '📏', label: 'Line' },
    { type: 'rectangle', icon: '▭', label: 'Rectangle' },
    { type: 'square', icon: '▢', label: 'Square' },
    { type: 'circle', icon: '⭕', label: 'Circle' },
  ];

  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Yellow', value: '#F59E0B' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Orange', value: '#F97316' },
  ];

  const handleClear = () => {
    if (roomId && isConnected) {
      const socket = getSocket();
      socket.emit('clear-whiteboard', roomId);
    }
    dispatch(clearStrokes());
  };

  const handleUndo = () => {
    if (roomId && isConnected) {
      const socket = getSocket();
      socket.emit('undo-stroke', roomId);
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    dispatch(logout());
  };

  // Auto-adjust line width when switching tools
  useEffect(() => {
    if (tool === 'eraser' && lineWidth < 10) {
      dispatch(setLineWidth(15));
    } else if (tool === 'highlighter' && lineWidth < 5) {
      dispatch(setLineWidth(10));
    } else if (tool === 'pen' && lineWidth > 20) {
      // Reset to reasonable pen size if too large
      dispatch(setLineWidth(2));
    }
  }, [tool, lineWidth, dispatch]);

  return (
    <>
      {/* Top Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm h-16">
        <div className="flex items-center justify-between h-full px-6">
          {/* Left side - Menu Button, Whiteboard Name & Status */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Toggle Sidebar"
            >
              {isSidebarOpen ? '✕' : '☰'}
            </button>
            {whiteboardName && (
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                {whiteboardName}
              </h1>
            )}
            <div className="hidden md:flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {onBackToList && (
              <button
                onClick={onBackToList}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Back to Whiteboard List"
              >
                ← Back
              </button>
            )}
            <button
              onClick={handleUndo}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              disabled={!isConnected}
              title="Undo Last Stroke"
            >
              ↶ Undo
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              disabled={!isConnected}
              title="Clear Whiteboard"
            >
              🗑️ Clear
            </button>
            {isAuthenticated && roomId && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Settings"
              >
                ⚙️
              </button>
            )}
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                title="Logout"
              >
                Logout
              </button>
            )}
            <button
              onClick={() => dispatch(toggleTheme())}
              className="p-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>

      {/* Left Sidebar Toolbar */}
      <div className={`fixed left-0 top-16 bottom-0 z-40 w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg overflow-y-auto transition-transform duration-300 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6 space-y-6">
          {/* Tool Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Drawing Tools
            </label>
            <div className="grid grid-cols-3 gap-2">
              {tools.map((t) => (
                <button
                  key={t.type}
                  onClick={() => dispatch(setTool(t.type))}
                  className={`px-4 py-3 text-sm rounded-lg border-2 transition-all ${
                    tool === t.type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md scale-105'
                      : 'border-gray-300 dark:border-gray-600 hover:scale-105 bg-white dark:bg-gray-700'
                  }`}
                  title={t.label}
                >
                  <div className="text-2xl mb-1">{t.icon}</div>
                  {/* <div className="text-xs font-medium">{t.label}</div> */}
                </button>
              ))}
            </div>
          </div>

          {/* Shape Selection */}
          {tool !== 'eraser' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Shapes
              </label>
              <div className="grid grid-cols-3 gap-2">
                {shapes.map((s) => (
                  <button
                    key={s.type}
                    onClick={() => dispatch(setShape(s.type))}
                    className={`px-4 py-3 text-sm rounded-lg border-2 transition-all ${
                      shape === s.type
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md scale-105'
                        : 'border-gray-300 dark:border-gray-600 hover:scale-105 bg-white dark:bg-gray-700'
                    }`}
                    title={s.label}
                  >
                    <div className="text-2xl mb-1">{s.icon}</div>
                    {/* <div className="text-xs font-medium">{s.label}</div> */}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Picker */}
          {tool !== 'eraser' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Colors
              </label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => dispatch(setColor(c.value))}
                    className={`w-12 h-12 rounded-lg border-2 transition-all ${
                      color === c.value
                        ? 'border-gray-900 dark:border-white scale-110 shadow-lg ring-2 ring-blue-500'
                        : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 dark:text-gray-400 flex-1">Custom Color:</label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => dispatch(setColor(e.target.value))}
                  className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                  title="Custom Color"
                />
              </div>
            </div>
          )}

          {/* Line Width */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Brush Size
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min={tool === 'eraser' ? '10' : '1'}
                max={tool === 'eraser' ? '50' : tool === 'highlighter' ? '30' : '20'}
                value={lineWidth}
                onChange={(e) => dispatch(setLineWidth(Number(e.target.value)))}
                className="w-full"
              />
              <div className="text-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lineWidth}px
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && roomId && isAuthenticated && (
        <WhiteboardSettings
          roomId={roomId}
          onClose={() => setShowSettings(false)}
          onUpdate={() => {
            if (onUpdate) onUpdate();
            setShowSettings(false);
          }}
          onDelete={() => {
            if (onBackToList) {
              onBackToList();
            }
            setShowSettings(false);
          }}
        />
      )}
    </>
  );
}

