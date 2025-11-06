'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  startStroke,
  updateStroke,
  endStroke,
  addStroke,
  clearStrokes,
  removeLastStroke,
  setStrokes,
  setConnected,
  setWhiteboardName,
  Stroke,
  ToolType,
  ShapeType,
} from '../store/slices/whiteboardSlice';
import { getSocket, disconnectSocket } from '../lib/socket';

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawingStroke, setCurrentDrawingStroke] = useState<Stroke | null>(null);
  const dispatch = useAppDispatch();
  const { strokes, color, lineWidth, roomId, userId, isConnected, tool, shape, backgroundType } = useAppSelector(
    (state) => state.whiteboard
  );

  useEffect(() => {
    setIsClient(true);
    return () => {
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    if (!isClient || !roomId) return;

    const socket = getSocket();

    socket.on('connect', () => {
      dispatch(setConnected(true));
      socket.emit('join-room', roomId);
    });

    socket.on('disconnect', () => {
      dispatch(setConnected(false));
    });

    socket.on('whiteboard-loaded', (data: { strokes: Stroke[]; name?: string; roomId?: string }) => {
      dispatch(setStrokes(data.strokes));
      if (data.name) {
        dispatch(setWhiteboardName(data.name));
      }
    });

    socket.on('stroke-drawn', (stroke: Stroke) => {
      // Don't add if it's our own stroke (we already have it locally)
      if (stroke.userId !== userId) {
        dispatch(addStroke(stroke));
      }
    });

    socket.on('whiteboard-cleared', () => {
      dispatch(clearStrokes());
    });

    socket.on('stroke-undone', () => {
      dispatch(removeLastStroke());
    });

    socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
      // Dispatch custom event for parent components to handle
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('socket-error', { detail: error }));
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('whiteboard-loaded');
      socket.off('stroke-drawn');
      socket.off('whiteboard-cleared');
      socket.off('stroke-undone');
      socket.off('error');
    };
  }, [isClient, roomId, dispatch, userId]);

  const drawStroke = useCallback((context: CanvasRenderingContext2D, stroke: Stroke) => {
    const strokeTool = stroke.tool || 'pen';
    const strokeShape = stroke.shape || 'freehand';

    // Save the current context state
    context.save();

    // Set up context based on tool
    if (strokeTool === 'eraser') {
      context.globalCompositeOperation = 'destination-out';
      context.strokeStyle = 'rgba(0,0,0,1)';
      // Use a larger default size for eraser
      context.lineWidth = Math.max(stroke.width, 10);
    } else if (strokeTool === 'highlighter') {
      // Use screen blend mode for better highlighter effect
      context.globalCompositeOperation = 'multiply';
      context.globalAlpha = 0.5;
      // Convert hex color to rgba - keep alpha at 1 since we use globalAlpha
      const r = parseInt(stroke.color.slice(1, 3), 16);
      const g = parseInt(stroke.color.slice(3, 5), 16);
      const b = parseInt(stroke.color.slice(5, 7), 16);
      context.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    } else {
      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = 1.0;
      context.strokeStyle = stroke.color;
    }

    context.lineWidth = stroke.width;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Handle shapes differently
    if (strokeShape === 'freehand') {
      if (stroke.points.length === 0) return;
      
      context.beginPath();
      context.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        context.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      context.stroke();
    } else if (strokeShape === 'line' && stroke.startPoint && stroke.endPoint) {
      context.beginPath();
      context.moveTo(stroke.startPoint.x, stroke.startPoint.y);
      context.lineTo(stroke.endPoint.x, stroke.endPoint.y);
      context.stroke();
    } else if (strokeShape === 'rectangle' && stroke.startPoint && stroke.endPoint) {
      const x = Math.min(stroke.startPoint.x, stroke.endPoint.x);
      const y = Math.min(stroke.startPoint.y, stroke.endPoint.y);
      const width = Math.abs(stroke.endPoint.x - stroke.startPoint.x);
      const height = Math.abs(stroke.endPoint.y - stroke.startPoint.y);
      context.strokeRect(x, y, width, height);
    } else if (strokeShape === 'square' && stroke.startPoint && stroke.endPoint) {
      const dx = stroke.endPoint.x - stroke.startPoint.x;
      const dy = stroke.endPoint.y - stroke.startPoint.y;
      const side = Math.max(Math.abs(dx), Math.abs(dy));
      const x = stroke.startPoint.x < stroke.endPoint.x 
        ? stroke.startPoint.x 
        : stroke.startPoint.x - side;
      const y = stroke.startPoint.y < stroke.endPoint.y 
        ? stroke.startPoint.y 
        : stroke.startPoint.y - side;
      context.strokeRect(x, y, side, side);
    } else if (strokeShape === 'circle' && stroke.startPoint && stroke.endPoint) {
      // Calculate center and radius from start and end points
      const centerX = (stroke.startPoint.x + stroke.endPoint.x) / 2;
      const centerY = (stroke.startPoint.y + stroke.endPoint.y) / 2;
      const radius = Math.sqrt(
        Math.pow(stroke.endPoint.x - stroke.startPoint.x, 2) +
        Math.pow(stroke.endPoint.y - stroke.startPoint.y, 2)
      ) / 2;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      context.stroke();
    }

    // Restore the context state
    context.restore();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isClient) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redraw();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function drawBackground(ctx: CanvasRenderingContext2D, canvasElement: HTMLCanvasElement) {
      // Always keep whiteboard white (like a real whiteboard)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

      if (backgroundType === 'blank') {
        // Plain white background - nothing to draw
        return;
      }

      // Set up grid/horizontal line style
      ctx.strokeStyle = '#e5e7eb'; // Light gray color
      ctx.lineWidth = 1;

      if (backgroundType === 'grid') {
        // Draw grid pattern
        const gridSize = 20; // Size of each grid cell
        
        // Draw vertical lines
        for (let x = 0; x <= canvasElement.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvasElement.height);
          ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= canvasElement.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvasElement.width, y);
          ctx.stroke();
        }
      } else if (backgroundType === 'horizontal') {
        // Draw only horizontal lines
        const lineSpacing = 20; // Spacing between horizontal lines
        
        for (let y = 0; y <= canvasElement.height; y += lineSpacing) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvasElement.width, y);
          ctx.stroke();
        }
      }
    }

    function redraw() {
      if (!ctx || !canvas) return;
      
      // Draw background first on main canvas
      drawBackground(ctx, canvas);
      
      // Create an offscreen canvas for all strokes (to protect background from eraser)
      const strokesCanvas = document.createElement('canvas');
      strokesCanvas.width = canvas.width;
      strokesCanvas.height = canvas.height;
      const strokesCtx = strokesCanvas.getContext('2d');
      if (!strokesCtx) return;
      
      // Draw all strokes on the offscreen canvas (eraser will erase strokes, not background)
      strokes.forEach((stroke) => {
        drawStroke(strokesCtx, stroke);
      });
      
      // Draw current stroke if drawing
      if (currentDrawingStroke) {
        drawStroke(strokesCtx, currentDrawingStroke);
      }
      
      // Composite the strokes canvas onto the main canvas
      // The background on main canvas remains untouched, and eraser strokes on the
      // offscreen canvas only erase strokes, not the background
      ctx.drawImage(strokesCanvas, 0, 0);
    };

    const getPointFromEvent = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      if (e instanceof TouchEvent) {
        const touch = e.touches[0] || e.changedTouches[0];
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const point = getPointFromEvent(e);
      setIsDrawing(true);
      
      // Eraser and highlighter should always use freehand shape
      const effectiveShape = (tool === 'eraser' || tool === 'highlighter') ? 'freehand' : shape;
      const isShape = effectiveShape !== 'freehand';
      
      const newStroke: Stroke = {
        id: `stroke-${Date.now()}-${Math.random()}`,
        points: isShape ? [] : [point],
        color: tool === 'eraser' ? '#000000' : color,
        width: tool === 'eraser' ? Math.max(lineWidth, 10) : lineWidth,
        timestamp: Date.now(),
        userId,
        tool,
        shape: effectiveShape,
        startPoint: isShape ? point : undefined,
        endPoint: isShape ? point : undefined,
      };
      setCurrentDrawingStroke(newStroke);
      dispatch(startStroke({ point, color, width: lineWidth }));
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (isDrawing && currentDrawingStroke) {
        const point = getPointFromEvent(e);
        const isShape = currentDrawingStroke.shape !== 'freehand' && currentDrawingStroke.shape !== undefined;
        
        const updatedStroke: Stroke = {
          ...currentDrawingStroke,
          points: isShape ? currentDrawingStroke.points : [...currentDrawingStroke.points, point],
          endPoint: isShape ? point : currentDrawingStroke.endPoint,
        };
        setCurrentDrawingStroke(updatedStroke);
        
        if (!isShape) {
          dispatch(updateStroke(point));
        }
        
        redraw(); // Immediate feedback
      }
    };

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (isDrawing && currentDrawingStroke) {
        const isShape = currentDrawingStroke.shape !== 'freehand' && currentDrawingStroke.shape !== undefined;
        const hasValidData = isShape 
          ? (currentDrawingStroke.startPoint && currentDrawingStroke.endPoint)
          : currentDrawingStroke.points.length > 0;
        
        if (hasValidData) {
          setIsDrawing(false);
          dispatch(endStroke());
          
          // Add to strokes and emit to server
          dispatch(addStroke(currentDrawingStroke));
          
          if (roomId && isConnected) {
            const socket = getSocket();
            socket.emit('draw-stroke', {
              ...currentDrawingStroke,
              roomId,
            });
          }
        }
        
        setCurrentDrawingStroke(null);
      }
    };

    // Mouse events
    canvas.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    // Touch events
    canvas.addEventListener('touchstart', handleStart);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);

    redraw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('touchstart', handleStart);
    };
  }, [strokes, color, lineWidth, userId, roomId, isConnected, dispatch, isClient, isDrawing, currentDrawingStroke, drawStroke, tool, shape, backgroundType]);

  if (!isClient) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Create custom cursor styles for eraser and highlighter
  const getCursorStyle = () => {
    switch (tool) {
      case 'eraser':
        // Eraser cursor - rectangular eraser shape
        const eraserSVG = encodeURIComponent(
          '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
          '<rect x="6" y="14" width="20" height="12" fill="#fff" stroke="#000" stroke-width="2" rx="2"/>' +
          '<line x1="10" y1="14" x2="16" y2="6" stroke="#000" stroke-width="2" stroke-linecap="round"/>' +
          '<line x1="22" y1="14" x2="16" y2="6" stroke="#000" stroke-width="2" stroke-linecap="round"/>' +
          '</svg>'
        );
        return {
          cursor: `url("data:image/svg+xml,${eraserSVG}") 16 16, auto`,
        };
      case 'highlighter':
        // Highlighter cursor - marker/highlighter shape
        const highlighterSVG = encodeURIComponent(
          '<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
          '<path d="M 6 20 Q 10 16, 16 20 Q 22 16, 26 20 L 26 26 L 6 26 Z" fill="#FFEB3B" fill-opacity="0.6" stroke="#000" stroke-width="1.5"/>' +
          '<path d="M 8 23 L 24 23" stroke="#000" stroke-width="1" stroke-opacity="0.4"/>' +
          '<circle cx="16" cy="18" r="1.5" fill="#000" fill-opacity="0.3"/>' +
          '</svg>'
        );
        return {
          cursor: `url("data:image/svg+xml,${highlighterSVG}") 16 20, auto`,
        };
      case 'pen':
      default:
        return {
          cursor: 'crosshair',
        };
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full touch-none bg-white border border-gray-200 dark:border-gray-700 shadow-inner"
      style={getCursorStyle()}
    />
  );
}
