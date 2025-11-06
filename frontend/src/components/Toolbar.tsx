'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setColor, setLineWidth, clearStrokes, setTool, setShape, setBackgroundType, ToolType, ShapeType, BackgroundType } from '../store/slices/whiteboardSlice';
import { getSocket } from '../lib/socket';
import WhiteboardSettings from './WhiteboardSettings';

interface ToolbarProps {
  onBackToList?: () => void;
  onUpdate?: () => void;
}

// Helper function to format keyboard shortcut for display
const formatShortcut = (key: string): string => {
  if (typeof window === 'undefined') {
    return `Ctrl + ${key.toUpperCase()}`;
  }
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifier = isMac ? '⌘' : 'Ctrl';
  return `${modifier} + ${key.toUpperCase()}`;
};

// Helper function to check if modifier key is pressed
const isModifierPressed = (e: KeyboardEvent): boolean => {
  return e.ctrlKey || e.metaKey;
};

export default function Toolbar({ onBackToList, onUpdate }: ToolbarProps) {
  const dispatch = useAppDispatch();
  const { color, lineWidth, roomId, whiteboardName, whiteboardOwner, isConnected, tool, shape, backgroundType } = useAppSelector((state) => state.whiteboard);
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [showSettings, setShowSettings] = useState(false);

  // Combined tools and shapes - only one can be selected at a time
  const allTools = [
    // Drawing tools
    { tool: 'pen' as ToolType, shape: 'freehand' as ShapeType, icon: '✏️', label: 'Pen', shortcut: 'P' },
    { tool: 'eraser' as ToolType, shape: 'freehand' as ShapeType, icon: '🧹', label: 'Eraser', shortcut: 'E' },
    { tool: 'highlighter' as ToolType, shape: 'freehand' as ShapeType, icon: '🖍️', label: 'Highlighter', shortcut: 'H' },
    // Shapes
    { tool: 'pen' as ToolType, shape: 'line' as ShapeType, icon: '📏', label: 'Line', shortcut: 'L' },
    { tool: 'pen' as ToolType, shape: 'rectangle' as ShapeType, icon: '▭', label: 'Rectangle', shortcut: 'R' },
    { tool: 'pen' as ToolType, shape: 'square' as ShapeType, icon: '▢', label: 'Square', shortcut: 'S' },
    { tool: 'pen' as ToolType, shape: 'circle' as ShapeType, icon: '⭕', label: 'Circle', shortcut: 'O' },
  ];

  // Check if a tool/shape combination is currently selected
  const isToolSelected = (toolType: ToolType, shapeType: ShapeType) => {
    return tool === toolType && shape === shapeType;
  };

  // Handle tool selection
  const handleToolSelect = (toolType: ToolType, shapeType: ShapeType) => {
    dispatch(setTool(toolType));
    dispatch(setShape(shapeType));
  };

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

  const handleClear = useCallback(() => {
    if (roomId && isConnected) {
      const socket = getSocket();
      socket.emit('clear-whiteboard', roomId);
    }
    dispatch(clearStrokes());
  }, [roomId, isConnected, dispatch]);

  const handleUndo = useCallback(() => {
    if (roomId && isConnected) {
      const socket = getSocket();
      socket.emit('undo-stroke', roomId);
    }
  }, [roomId, isConnected]);

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

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      // Check if modifier key is pressed
      if (!isModifierPressed(e)) {
        return;
      }

      const key = e.key.toLowerCase();

      // Tool shortcuts
      const toolMap: Record<string, { tool: ToolType; shape: ShapeType }> = {
        'p': { tool: 'pen', shape: 'freehand' },
        'e': { tool: 'eraser', shape: 'freehand' },
        'h': { tool: 'highlighter', shape: 'freehand' },
        'l': { tool: 'pen', shape: 'line' },
        'r': { tool: 'pen', shape: 'rectangle' },
        's': { tool: 'pen', shape: 'square' },
        'o': { tool: 'pen', shape: 'circle' },
      };

      if (toolMap[key]) {
        e.preventDefault();
        dispatch(setTool(toolMap[key].tool));
        dispatch(setShape(toolMap[key].shape));
        return;
      }

      // Action shortcuts
      if (key === 'z' && !e.shiftKey) {
        // Undo: Ctrl/Cmd + Z
        e.preventDefault();
        handleUndo();
      } else if (key === 'delete' || key === 'backspace' || key === 'k') {
        // Clear: Ctrl/Cmd + Delete/Backspace/K
        e.preventDefault();
        if (isConnected) {
          handleClear();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch, isConnected, handleUndo, handleClear]);

  return (
    <>
      {/* Top Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm h-16">
        <div className="flex items-center justify-between h-full px-6">
          {/* Left side - Back Button, Whiteboard Name & Status */}
          <div className="flex items-center gap-4">
            {onBackToList && (
              <button
                onClick={onBackToList}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Back to Whiteboard List"
              >
                ← Back
              </button>
            )}
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
            {/* Settings button: Only show if:
                1. User is authenticated
                2. Whiteboard owner is not 'guest'
                3. Current user is the owner of the whiteboard */}
            {isAuthenticated && roomId && whiteboardOwner && whiteboardOwner !== 'guest' && user && String(whiteboardOwner) === String(user.id) && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Settings"
              >
                ⚙️ Settings
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Left Sidebar Toolbar */}
      <div className="fixed left-0 top-16 bottom-0 z-40 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Combined Tools and Shapes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Tools
            </label>
            <div className="grid grid-cols-2 gap-2">
              {allTools.map((t, index) => {
                const isSelected = isToolSelected(t.tool, t.shape);
                const tooltipText = `${t.label} (${formatShortcut(t.shortcut)})`;
                return (
                  <button
                    key={`${t.tool}-${t.shape}-${index}`}
                    onClick={() => handleToolSelect(t.tool, t.shape)}
                    className={`flex flex-col items-center justify-center gap-1 px-1 py-1 text-sm rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md scale-105'
                        : 'border-gray-300 dark:border-gray-600 hover:scale-105 bg-white dark:bg-gray-700'
                    }`}
                    title={tooltipText}
                  >
                    <div className="text-2xl">{t.icon}</div>
                    <div className="text-[12px]">{t.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Picker */}
          {tool !== 'eraser' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Colors
              </label>
              <div className="grid grid-cols-3 gap-2 mb-3">
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

          {/* Background Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Background
            </label>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => dispatch(setBackgroundType('blank'))}
                className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                  backgroundType === 'blank'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-700'
                }`}
                title="Plain Whiteboard"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">⬜</span>
                  <span>Plain</span>
                </div>
              </button>
              <button
                onClick={() => dispatch(setBackgroundType('grid'))}
                className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                  backgroundType === 'grid'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-700'
                }`}
                title="Grid"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">▦</span>
                  <span>Grid</span>
                </div>
              </button>
              <button
                onClick={() => dispatch(setBackgroundType('horizontal'))}
                className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                  backgroundType === 'horizontal'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-700'
                }`}
                title="Horizontal Lines"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">☰</span>
                  <span>Lines</span>
                </div>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Actions
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleUndo}
                className={`flex flex-col items-center justify-center gap-1 px-1 py-1 text-sm rounded-lg border-2 transition-all ${
                  !isConnected
                    ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 opacity-50 cursor-not-allowed'
                    : 'border-gray-300 dark:border-gray-600 hover:scale-105 bg-white dark:bg-gray-700'
                }`}
                disabled={!isConnected}
                title={`Undo Last Stroke (${formatShortcut('Z')})`}
              >
                <div className="text-2xl">↶</div>
                <div className="text-[12px]">Undo</div>
              </button>
              <button
                onClick={handleClear}
                className={`px-4 py-3 text-sm rounded-lg border-2 transition-all ${
                  !isConnected
                    ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 opacity-50 cursor-not-allowed'
                    : 'border-red-500 bg-red-50 dark:bg-red-900/30 hover:scale-105'
                }`}
                disabled={!isConnected}
                title={`Clear Whiteboard (${formatShortcut('K')})`}
              >
                <div className="text-2xl">🗑️</div>
                <div className="text-[12px]">Clear</div>
              </button>
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

