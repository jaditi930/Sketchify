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
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartedOnCanvasRef = useRef(false);
  const strokesCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const needsRedrawRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const eraserSnapshotRef = useRef<ImageData | null>(null);
  const isEraserActiveRef = useRef(false);
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

  const drawStroke = useCallback((context: CanvasRenderingContext2D, stroke: Stroke, skipEraserPoints = false) => {
    const strokeTool = stroke.tool || 'pen';
    const strokeShape = stroke.shape || 'freehand';

    // Save the current context state
    context.save();

    // Set up context based on tool
    if (strokeTool === 'eraser') {
      // For eraser, we'll use circular fills with proper anti-aliasing to avoid borders
      if (!skipEraserPoints && stroke.points.length > 0) {
        // Use a slightly larger radius to ensure complete coverage and eliminate borders
        const eraserRadius = Math.max(stroke.width / 2, 5) + 1;
        context.globalCompositeOperation = 'destination-out';
        
        // Enable image smoothing for better anti-aliasing
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        
        // Draw filled circles for each point with overlapping to ensure no gaps
        stroke.points.forEach((point, index) => {
          context.beginPath();
          context.arc(point.x, point.y, eraserRadius, 0, 2 * Math.PI);
          context.fill();
          
          // Connect to previous point with overlapping circles to eliminate borders
          if (index > 0) {
            const prev = stroke.points[index - 1];
            const curr = point;
            const dist = Math.sqrt(
              Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
            );
            
            // Use smaller step size (30% of radius) for better coverage and overlap
            // This ensures circles overlap by at least 70% of radius, eliminating borders
            if (dist > 0) {
              const stepSize = eraserRadius * 0.3;
              const steps = Math.max(Math.ceil(dist / stepSize), 2);
              
              for (let j = 1; j < steps; j++) {
                const t = j / steps;
                const x = prev.x + (curr.x - prev.x) * t;
                const y = prev.y + (curr.y - prev.y) * t;
                context.beginPath();
                context.arc(x, y, eraserRadius, 0, 2 * Math.PI);
                context.fill();
              }
            }
          }
        });
        
        context.restore();
        return;
      }
      // Fallback for shapes (though eraser shouldn't use shapes)
      context.globalCompositeOperation = 'destination-out';
      context.strokeStyle = 'rgba(0,0,0,1)';
      context.lineWidth = Math.max(stroke.width, 10);
    } else if (strokeTool === 'highlighter') {
      // For highlighter, ensure the selected color is always used consistently
      // Reset all context state explicitly to avoid any contamination
      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = 1.0;
      context.imageSmoothingEnabled = true;
      
      // Parse hex color - handle #RRGGBB format
      const colorStr = String(stroke.color).trim();
      let hexColor = colorStr;
      
      // Remove # if present
      if (hexColor.startsWith('#')) {
        hexColor = hexColor.substring(1);
      }
      
      // Ensure we have exactly 6 hex characters
      if (hexColor.length === 6) {
        // Parse RGB components
        const rHex = hexColor.substring(0, 2);
        const gHex = hexColor.substring(2, 4);
        const bHex = hexColor.substring(4, 6);
        
        const r = parseInt(rHex, 16);
        const g = parseInt(gHex, 16);
        const b = parseInt(bHex, 16);
        
        // Verify parsing was successful (all values should be 0-255)
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          // Use 0.7 opacity for highlighter - higher opacity makes color more visible
          // This ensures the selected color is clearly visible while still being semi-transparent
          const rgbaColor = `rgba(${r}, ${g}, ${b}, 1)`;
          context.strokeStyle = rgbaColor;
          // Debug: log color being used (remove after debugging)
          if (process.env.NODE_ENV === 'development') {
            console.log('Highlighter color:', {
              original: stroke.color,
              parsed: { r, g, b },
              rgba: rgbaColor
            });
          }
        } else {
          // Fallback: use the color as-is if parsing fails
          console.error('Failed to parse highlighter color:', stroke.color, 'r:', r, 'g:', g, 'b:', b);
          context.strokeStyle = stroke.color;
        }
      } else {
        // If color format is unexpected, try to use it directly
        console.warn('Unexpected color format for highlighter:', stroke.color, 'length:', hexColor.length);
        context.strokeStyle = stroke.color;
      }
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
      if (stroke.points.length === 0) {
        context.restore();
        return;
      }
      
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

  // Draw background on background canvas
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, canvasElement: HTMLCanvasElement, bgType: string) => {
    // Always keep whiteboard white (like a real whiteboard)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    if (bgType === 'blank') {
      // Plain white background - nothing to draw
      return;
    }

    // Set up grid/horizontal line style
    ctx.strokeStyle = '#e5e7eb'; // Light gray color
    ctx.lineWidth = 1;

    if (bgType === 'grid') {
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
    } else if (bgType === 'horizontal') {
      // Draw only horizontal lines
      const lineSpacing = 20; // Spacing between horizontal lines
      
      for (let y = 0; y <= canvasElement.height; y += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasElement.width, y);
        ctx.stroke();
      }
    }
  }, []);

  // Apply eraser stroke incrementally to strokes canvas
  const applyEraserIncremental = useCallback((point: { x: number; y: number }, width: number) => {
    const strokesCtx = strokesCtxRef.current;
    if (!strokesCtx) return;
    
    // Use a slightly larger radius to ensure complete coverage and eliminate borders
    const eraserRadius = Math.max(width / 2, 5) + 1;
    strokesCtx.save();
    strokesCtx.globalCompositeOperation = 'destination-out';
    strokesCtx.imageSmoothingEnabled = true;
    strokesCtx.imageSmoothingQuality = 'high';
    
    // Draw circle to erase with full opacity
    strokesCtx.beginPath();
    strokesCtx.arc(point.x, point.y, eraserRadius, 0, 2 * Math.PI);
    strokesCtx.fill();
    
    // If we have a last point, fill the gap with overlapping circles
    // Use smaller step size (30% of radius) to ensure complete overlap and no borders
    if (lastPointRef.current) {
      const prev = lastPointRef.current;
      const dist = Math.sqrt(
        Math.pow(point.x - prev.x, 2) + Math.pow(point.y - prev.y, 2)
      );
      // Always fill gaps, even small ones, to ensure smooth erasing
      if (dist > 0) {
        // Use more steps for better coverage - circles should overlap by at least 50% of radius
        const stepSize = eraserRadius * 0.3;
        const steps = Math.max(Math.ceil(dist / stepSize), 2);
        for (let j = 1; j < steps; j++) {
          const t = j / steps;
          const x = prev.x + (point.x - prev.x) * t;
          const y = prev.y + (point.y - prev.y) * t;
          strokesCtx.beginPath();
          strokesCtx.arc(x, y, eraserRadius, 0, 2 * Math.PI);
          strokesCtx.fill();
        }
      }
    }
    
    strokesCtx.restore();
  }, []);

  // Redraw function with requestAnimationFrame throttling
  const scheduleRedraw = useCallback(() => {
    if (rafIdRef.current !== null) return;
    
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const strokesCtx = strokesCtxRef.current;
      const backgroundCtx = backgroundCtxRef.current;
      
      if (!canvas || !ctx || !strokesCtx || !backgroundCtx) return;
      
      // Clear main canvas and draw background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(backgroundCanvasRef.current!, 0, 0);
      
      // Draw strokes canvas (for eraser, it's already been modified incrementally)
      ctx.drawImage(strokesCanvasRef.current!, 0, 0);
      
      // For non-eraser strokes, draw current stroke on top
      if (currentDrawingStroke && currentDrawingStroke.tool !== 'eraser') {
        drawStroke(ctx, currentDrawingStroke);
      }
    });
  }, [currentDrawingStroke, drawStroke]);

  // Initialize canvases and redraw when strokes or background changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isClient) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Set canvas to fixed size
    const CANVAS_WIDTH = 1500;
    const CANVAS_HEIGHT = 1500;
    
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Create or get background canvas
    if (!backgroundCanvasRef.current) {
      backgroundCanvasRef.current = document.createElement('canvas');
      backgroundCanvasRef.current.width = CANVAS_WIDTH;
      backgroundCanvasRef.current.height = CANVAS_HEIGHT;
      backgroundCtxRef.current = backgroundCanvasRef.current.getContext('2d', { alpha: false });
    }
    
    // Create or get strokes canvas
    if (!strokesCanvasRef.current) {
      strokesCanvasRef.current = document.createElement('canvas');
      strokesCanvasRef.current.width = CANVAS_WIDTH;
      strokesCanvasRef.current.height = CANVAS_HEIGHT;
      strokesCtxRef.current = strokesCanvasRef.current.getContext('2d', { alpha: true });
    }

    const strokesCtx = strokesCtxRef.current;
    const backgroundCtx = backgroundCtxRef.current;
    if (!strokesCtx || !backgroundCtx) return;

    // Redraw background when background type changes
    drawBackground(backgroundCtx, backgroundCanvasRef.current, backgroundType);
    
    // Redraw all strokes on strokes canvas
    strokesCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    strokes.forEach((stroke) => {
      drawStroke(strokesCtx, stroke);
    });
    
    // Composite everything
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.drawImage(backgroundCanvasRef.current, 0, 0);
    ctx.drawImage(strokesCanvasRef.current, 0, 0);
    
    if (currentDrawingStroke) {
      drawStroke(ctx, currentDrawingStroke);
    }
  }, [strokes, backgroundType, isClient, drawStroke, drawBackground]);

  // Update current stroke drawing in real-time
  useEffect(() => {
    if (currentDrawingStroke && isDrawing) {
      scheduleRedraw();
    }
  }, [currentDrawingStroke, isDrawing, scheduleRedraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isClient) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const getPointFromEvent = (e: MouseEvent | TouchEvent | PointerEvent): { x: number; y: number } | null => {
      const rect = canvas.getBoundingClientRect();
      
      if (e instanceof TouchEvent) {
        const touch = e.touches[0] || e.changedTouches[0];
        if (!touch) return null;
        return {
          x: ((touch.clientX - rect.left) / rect.width) * canvas.width,
          y: ((touch.clientY - rect.top) / rect.height) * canvas.height,
        };
      } else if (e instanceof PointerEvent) {
        return {
          x: ((e.clientX - rect.left) / rect.width) * canvas.width,
          y: ((e.clientY - rect.top) / rect.height) * canvas.height,
        };
      } else {
        return {
          x: ((e.clientX - rect.left) / rect.width) * canvas.width,
          y: ((e.clientY - rect.top) / rect.height) * canvas.height,
        };
      }
    };

    // Helper to check if event target is an interactive element (should not be prevented)
    const isInteractiveElement = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      
      // Check if it's the canvas itself
      if (target === canvas) return false;
      
      const tagName = target.tagName.toLowerCase();
      const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'button' || tagName === 'select';
      const isContentEditable = target.isContentEditable;
      
      // Check if it's inside interactive containers (chat, toolbar, settings, etc)
      const isInChat = target.closest('[data-chat-container="true"]') !== null ||
                       target.closest('[class*="Chat"]') !== null || 
                       target.closest('form') !== null;
      const isInToolbar = target.closest('[class*="Toolbar"]') !== null ||
                          target.closest('nav') !== null ||
                          target.closest('header') !== null;
      const isInModal = target.closest('[role="dialog"]') !== null ||
                        target.closest('[class*="Settings"]') !== null;
      const isInButton = target.closest('button') !== null;
      const isInInput = target.closest('input, textarea, select') !== null;
      const isInFixed = target.closest('.fixed') !== null && 
                       (target.closest('[data-chat-container]') !== null ||
                        target.closest('nav') !== null ||
                        target.closest('header') !== null);
      
      return isInput || isContentEditable || isInChat || isInToolbar || isInModal || isInButton || isInInput || isInFixed;
    };

    // Unified handler for pointer events (works on all platforms including Linux)
    const handlePointerDown = (e: PointerEvent) => {
      if (isInteractiveElement(e.target)) {
        return;
      }
      
      if (e.target !== canvas && !(e.target instanceof Node && canvas.contains(e.target))) {
        return;
      }
      
      // Set pointer capture for this pointer
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
      
      const point = getPointFromEvent(e);
      if (!point) return;
      
      setIsDrawing(true);
      touchStartedOnCanvasRef.current = true;
      lastPointRef.current = point;
      
      // Eraser and highlighter should always use freehand shape
      const effectiveShape = (tool === 'eraser' || tool === 'highlighter') ? 'freehand' : shape;
      const isShape = effectiveShape !== 'freehand';
      
      // For eraser, save a snapshot of the strokes canvas so we can restore if cancelled
      if (tool === 'eraser') {
        const strokesCtx = strokesCtxRef.current;
        if (strokesCtx && strokesCanvasRef.current) {
          eraserSnapshotRef.current = strokesCtx.getImageData(0, 0, strokesCanvasRef.current.width, strokesCanvasRef.current.height);
          isEraserActiveRef.current = true;
        }
      }
      
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
      
      // For eraser, apply the first point immediately
      if (tool === 'eraser' && !isShape) {
        applyEraserIncremental(point, newStroke.width);
        scheduleRedraw();
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawing || !currentDrawingStroke) {
        return;
      }
      
      // Only handle if we have pointer capture or if pointer is over canvas
      if (!canvas.hasPointerCapture(e.pointerId) && e.target !== canvas) {
        return;
      }
      
      e.preventDefault();
      
      const point = getPointFromEvent(e);
      if (!point) return;
      
      const isShape = currentDrawingStroke.shape !== 'freehand' && currentDrawingStroke.shape !== undefined;
      
      // For eraser, apply incrementally to strokes canvas for real-time erasing
      if (currentDrawingStroke.tool === 'eraser' && !isShape) {
        applyEraserIncremental(point, currentDrawingStroke.width);
      }
      
      lastPointRef.current = point;
      
      const updatedStroke: Stroke = {
        ...currentDrawingStroke,
        points: isShape ? currentDrawingStroke.points : [...currentDrawingStroke.points, point],
        endPoint: isShape ? point : currentDrawingStroke.endPoint,
      };
      setCurrentDrawingStroke(updatedStroke);
      
      if (!isShape) {
        dispatch(updateStroke(point));
      }
      
      // Schedule redraw (throttled by requestAnimationFrame)
      scheduleRedraw();
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDrawing || !currentDrawingStroke) {
        canvas.releasePointerCapture(e.pointerId);
        touchStartedOnCanvasRef.current = false;
        return;
      }
      
      canvas.releasePointerCapture(e.pointerId);
      e.preventDefault();
      
      touchStartedOnCanvasRef.current = false;
      lastPointRef.current = null;

      const isShape = currentDrawingStroke.shape !== 'freehand' && currentDrawingStroke.shape !== undefined;
      const hasValidData = isShape 
        ? (currentDrawingStroke.startPoint && currentDrawingStroke.endPoint)
        : currentDrawingStroke.points.length > 0;
      
      if (hasValidData) {
        // For eraser, it's already been applied incrementally, but draw the complete stroke
        // to ensure any gaps are filled and borders are eliminated
        const strokesCtx = strokesCtxRef.current;
        if (strokesCtx) {
          // For eraser, redraw the complete stroke to fill any gaps
          if (currentDrawingStroke.tool === 'eraser') {
            drawStroke(strokesCtx, currentDrawingStroke);
          } else {
            drawStroke(strokesCtx, currentDrawingStroke);
          }
        }
        
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
        
        // Clear eraser snapshot and flag
        if (currentDrawingStroke.tool === 'eraser') {
          eraserSnapshotRef.current = null;
          isEraserActiveRef.current = false;
        }
      } else {
        // Stroke was cancelled or invalid - restore snapshot for eraser
        if (currentDrawingStroke.tool === 'eraser' && eraserSnapshotRef.current) {
          const strokesCtx = strokesCtxRef.current;
          if (strokesCtx && strokesCanvasRef.current) {
            strokesCtx.putImageData(eraserSnapshotRef.current, 0, 0);
            eraserSnapshotRef.current = null;
            isEraserActiveRef.current = false;
          }
        }
      }
      
      setCurrentDrawingStroke(null);
      scheduleRedraw();
    };

    // Mouse events (fallback for browsers without pointer events)
    const handleMouseDown = (e: MouseEvent) => {
      if (isInteractiveElement(e.target)) {
        return;
      }
      if (e.target !== canvas) {
        return;
      }
      e.preventDefault();
      
      const point = getPointFromEvent(e);
      if (!point) return;
      
      setIsDrawing(true);
      touchStartedOnCanvasRef.current = true;
      lastPointRef.current = point;
      
      const effectiveShape = (tool === 'eraser' || tool === 'highlighter') ? 'freehand' : shape;
      const isShape = effectiveShape !== 'freehand';
      
      // For eraser, save a snapshot of the strokes canvas so we can restore if cancelled
      if (tool === 'eraser') {
        const strokesCtx = strokesCtxRef.current;
        if (strokesCtx && strokesCanvasRef.current) {
          eraserSnapshotRef.current = strokesCtx.getImageData(0, 0, strokesCanvasRef.current.width, strokesCanvasRef.current.height);
          isEraserActiveRef.current = true;
        }
      }
      
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
      
      // For eraser, apply the first point immediately
      if (tool === 'eraser' && !isShape) {
        applyEraserIncremental(point, newStroke.width);
        scheduleRedraw();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing || !currentDrawingStroke) {
        return;
      }
      e.preventDefault();
      
      const point = getPointFromEvent(e);
      if (!point) return;
      
      const isShape = currentDrawingStroke.shape !== 'freehand' && currentDrawingStroke.shape !== undefined;
      
      // For eraser, apply incrementally to strokes canvas for real-time erasing
      if (currentDrawingStroke.tool === 'eraser' && !isShape) {
        applyEraserIncremental(point, currentDrawingStroke.width);
      }
      
      lastPointRef.current = point;
      
      const updatedStroke: Stroke = {
        ...currentDrawingStroke,
        points: isShape ? currentDrawingStroke.points : [...currentDrawingStroke.points, point],
        endPoint: isShape ? point : currentDrawingStroke.endPoint,
      };
      setCurrentDrawingStroke(updatedStroke);
      
      if (!isShape) {
        dispatch(updateStroke(point));
      }
      
      scheduleRedraw();
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDrawing || !currentDrawingStroke) {
        touchStartedOnCanvasRef.current = false;
        return;
      }
      e.preventDefault();
      
      touchStartedOnCanvasRef.current = false;
      lastPointRef.current = null;

      const isShape = currentDrawingStroke.shape !== 'freehand' && currentDrawingStroke.shape !== undefined;
      const hasValidData = isShape 
        ? (currentDrawingStroke.startPoint && currentDrawingStroke.endPoint)
        : currentDrawingStroke.points.length > 0;
      
      if (hasValidData) {
        // For eraser, it's already been applied incrementally, but draw the complete stroke
        // to ensure any gaps are filled and borders are eliminated
        const strokesCtx = strokesCtxRef.current;
        if (strokesCtx) {
          // For eraser, redraw the complete stroke to fill any gaps
          if (currentDrawingStroke.tool === 'eraser') {
            drawStroke(strokesCtx, currentDrawingStroke);
          } else {
            drawStroke(strokesCtx, currentDrawingStroke);
          }
        }
        
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
        
        // Clear eraser snapshot and flag
        if (currentDrawingStroke.tool === 'eraser') {
          eraserSnapshotRef.current = null;
          isEraserActiveRef.current = false;
        }
      } else {
        // Stroke was cancelled or invalid - restore snapshot for eraser
        if (currentDrawingStroke.tool === 'eraser' && eraserSnapshotRef.current) {
          const strokesCtx = strokesCtxRef.current;
          if (strokesCtx && strokesCanvasRef.current) {
            strokesCtx.putImageData(eraserSnapshotRef.current, 0, 0);
            eraserSnapshotRef.current = null;
            isEraserActiveRef.current = false;
          }
        }
      }
      
      setCurrentDrawingStroke(null);
      scheduleRedraw();
    };

    // Touch events (for mobile)
    const handleTouchStart = (e: TouchEvent) => {
      if (isInteractiveElement(e.target)) {
        touchStartedOnCanvasRef.current = false;
        return;
      }
      
      if (e.target === canvas || (e.target instanceof Node && canvas.contains(e.target))) {
        touchStartedOnCanvasRef.current = true;
        e.preventDefault();
        
        const point = getPointFromEvent(e);
        if (!point) return;
        
        setIsDrawing(true);
        lastPointRef.current = point;
        
        const effectiveShape = (tool === 'eraser' || tool === 'highlighter') ? 'freehand' : shape;
        const isShape = effectiveShape !== 'freehand';
        
        // For eraser, save a snapshot of the strokes canvas so we can restore if cancelled
        if (tool === 'eraser') {
          const strokesCtx = strokesCtxRef.current;
          if (strokesCtx && strokesCanvasRef.current) {
            eraserSnapshotRef.current = strokesCtx.getImageData(0, 0, strokesCanvasRef.current.width, strokesCanvasRef.current.height);
            isEraserActiveRef.current = true;
          }
        }
        
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
        
        // For eraser, apply the first point immediately
        if (tool === 'eraser' && !isShape) {
          applyEraserIncremental(point, newStroke.width);
          scheduleRedraw();
        }
      } else {
        touchStartedOnCanvasRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDrawing || !currentDrawingStroke) {
        return;
      }
      
      if (!touchStartedOnCanvasRef.current) {
        setIsDrawing(false);
        setCurrentDrawingStroke(null);
        return;
      }
      
      if (isInteractiveElement(e.target)) {
        setIsDrawing(false);
        setCurrentDrawingStroke(null);
        return;
      }
      
      e.preventDefault();
      
      const point = getPointFromEvent(e);
      if (!point) return;
      
      const isShape = currentDrawingStroke.shape !== 'freehand' && currentDrawingStroke.shape !== undefined;
      
      // For eraser, apply incrementally to strokes canvas for real-time erasing
      if (currentDrawingStroke.tool === 'eraser' && !isShape) {
        applyEraserIncremental(point, currentDrawingStroke.width);
      }
      
      lastPointRef.current = point;
      
      const updatedStroke: Stroke = {
        ...currentDrawingStroke,
        points: isShape ? currentDrawingStroke.points : [...currentDrawingStroke.points, point],
        endPoint: isShape ? point : currentDrawingStroke.endPoint,
      };
      setCurrentDrawingStroke(updatedStroke);
      
      if (!isShape) {
        dispatch(updateStroke(point));
      }
      
      scheduleRedraw();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDrawing || !currentDrawingStroke) {
        touchStartedOnCanvasRef.current = false;
        return;
      }
      
      if (!touchStartedOnCanvasRef.current) {
        setIsDrawing(false);
        setCurrentDrawingStroke(null);
        return;
      }
      
      if (isInteractiveElement(e.target)) {
        setIsDrawing(false);
        setCurrentDrawingStroke(null);
        touchStartedOnCanvasRef.current = false;
        return;
      }
      
      e.preventDefault();
      touchStartedOnCanvasRef.current = false;
      lastPointRef.current = null;

      const isShape = currentDrawingStroke.shape !== 'freehand' && currentDrawingStroke.shape !== undefined;
      const hasValidData = isShape 
        ? (currentDrawingStroke.startPoint && currentDrawingStroke.endPoint)
        : currentDrawingStroke.points.length > 0;
      
      if (hasValidData) {
        // For eraser, it's already been applied incrementally, but draw the complete stroke
        // to ensure any gaps are filled and borders are eliminated
        const strokesCtx = strokesCtxRef.current;
        if (strokesCtx) {
          // For eraser, redraw the complete stroke to fill any gaps
          if (currentDrawingStroke.tool === 'eraser') {
            drawStroke(strokesCtx, currentDrawingStroke);
          } else {
            drawStroke(strokesCtx, currentDrawingStroke);
          }
        }
        
        setIsDrawing(false);
        dispatch(endStroke());
        
        dispatch(addStroke(currentDrawingStroke));
        
        if (roomId && isConnected) {
          const socket = getSocket();
          socket.emit('draw-stroke', {
            ...currentDrawingStroke,
            roomId,
          });
        }
        
        // Clear eraser snapshot and flag
        if (currentDrawingStroke.tool === 'eraser') {
          eraserSnapshotRef.current = null;
          isEraserActiveRef.current = false;
        }
      } else {
        // Stroke was cancelled or invalid - restore snapshot for eraser
        if (currentDrawingStroke.tool === 'eraser' && eraserSnapshotRef.current) {
          const strokesCtx = strokesCtxRef.current;
          if (strokesCtx && strokesCanvasRef.current) {
            strokesCtx.putImageData(eraserSnapshotRef.current, 0, 0);
            eraserSnapshotRef.current = null;
            isEraserActiveRef.current = false;
          }
        }
      }
      
      setCurrentDrawingStroke(null);
      scheduleRedraw();
    };

    // Pointer events (primary - works on Linux, Windows, Mac)
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);

    // Mouse events (fallback)
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Touch events (mobile)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      // Cleanup pointer events
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      
      // Cleanup mouse events
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      // Cleanup touch events
      canvas.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      
      // Cancel any pending animation frame
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isClient, isDrawing, currentDrawingStroke, tool, shape, color, lineWidth, userId, roomId, isConnected, dispatch, drawStroke, scheduleRedraw, applyEraserIncremental]);

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
    <div ref={containerRef} className="w-full h-full overflow-auto">
      <canvas
        ref={canvasRef}
        className="touch-none bg-white border border-gray-200 dark:border-gray-700 shadow-inner"
        style={{
          ...getCursorStyle(),
          width: '2000px',
          height: '2000px',
          touchAction: 'none',
        }}
      />
    </div>
  );
}