import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Point {
  x: number;
  y: number;
}

export type ToolType = 'pen' | 'eraser' | 'highlighter';
export type ShapeType = 'freehand' | 'line' | 'rectangle' | 'square' | 'circle';
export type BackgroundType = 'blank' | 'grid' | 'horizontal';

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  timestamp: number;
  userId: string;
  tool?: ToolType;
  shape?: ShapeType;
  startPoint?: Point;
  endPoint?: Point;
}

interface WhiteboardState {
  strokes: Stroke[];
  currentStroke: Stroke | null;
  isDrawing: boolean;
  roomId: string | null;
  whiteboardName: string | null;
  whiteboardOwner: string | null;
  color: string;
  lineWidth: number;
  userId: string;
  isConnected: boolean;
  tool: ToolType;
  shape: ShapeType;
  backgroundType: BackgroundType;
}

const initialState: WhiteboardState = {
  strokes: [],
  currentStroke: null,
  isDrawing: false,
  roomId: null,
  whiteboardName: null,
  whiteboardOwner: null,
  color: '#000000',
  lineWidth: 2,
  userId: `user-${Math.random().toString(36).substr(2, 9)}`,
  isConnected: false,
  tool: 'pen',
  shape: 'freehand',
  backgroundType: 'blank',
};

const whiteboardSlice = createSlice({
  name: 'whiteboard',
  initialState,
  reducers: {
    setRoomId: (state, action: PayloadAction<string>) => {
      state.roomId = action.payload;
    },
    setStrokes: (state, action: PayloadAction<Stroke[]>) => {
      state.strokes = action.payload;
    },
    addStroke: (state, action: PayloadAction<Stroke>) => {
      state.strokes.push(action.payload);
    },
    clearStrokes: (state) => {
      state.strokes = [];
    },
    removeLastStroke: (state) => {
      state.strokes.pop();
    },
    startStroke: (state, action: PayloadAction<{ point: Point; color: string; width: number }>) => {
      state.isDrawing = true;
      state.currentStroke = {
        id: `stroke-${Date.now()}-${Math.random()}`,
        points: [action.payload.point],
        color: action.payload.color,
        width: action.payload.width,
        timestamp: Date.now(),
        userId: state.userId,
      };
    },
    updateStroke: (state, action: PayloadAction<Point>) => {
      if (state.currentStroke) {
        state.currentStroke.points.push(action.payload);
      }
    },
    endStroke: (state) => {
      if (state.currentStroke) {
        state.strokes.push(state.currentStroke);
        state.currentStroke = null;
      }
      state.isDrawing = false;
    },
    setColor: (state, action: PayloadAction<string>) => {
      state.color = action.payload;
    },
    setLineWidth: (state, action: PayloadAction<number>) => {
      state.lineWidth = action.payload;
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    setWhiteboardName: (state, action: PayloadAction<string | null>) => {
      state.whiteboardName = action.payload;
    },
    setWhiteboardOwner: (state, action: PayloadAction<string | null>) => {
      state.whiteboardOwner = action.payload;
    },
    setTool: (state, action: PayloadAction<ToolType>) => {
      state.tool = action.payload;
    },
    setShape: (state, action: PayloadAction<ShapeType>) => {
      state.shape = action.payload;
    },
    setBackgroundType: (state, action: PayloadAction<BackgroundType>) => {
      state.backgroundType = action.payload;
    },
  },
});

export const {
  setRoomId,
  setStrokes,
  addStroke,
  clearStrokes,
  removeLastStroke,
  startStroke,
  updateStroke,
  endStroke,
  setColor,
  setLineWidth,
  setConnected,
  setWhiteboardName,
  setWhiteboardOwner,
  setTool,
  setShape,
  setBackgroundType,
} = whiteboardSlice.actions;

export default whiteboardSlice.reducer;

