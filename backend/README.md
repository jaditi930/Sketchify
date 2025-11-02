# Backend API Documentation

A comprehensive REST API and WebSocket server for the Real-Time Collaboration Whiteboard application. Built with Express.js, Socket.io, MongoDB, and TypeScript.

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [REST API Endpoints](#rest-api-endpoints)
- [WebSocket Events](#websocket-events)
- [Data Models](#data-models)
- [Error Handling](#error-handling)

## Overview

The backend provides:
- **RESTful API** for whiteboard management and user authentication
- **WebSocket API** for real-time drawing synchronization and chat
- **JWT authentication** for secure access
- **MongoDB persistence** for whiteboard data and user management

## Base URL

```
Development: http://localhost:3001
Production: https://your-domain.com
```

## Authentication

### JWT Bearer Token

Most endpoints require authentication via JWT Bearer token:

```
Authorization: Bearer <your-jwt-token>
```

### Authentication Flow

1. **Register/Login** to get a JWT token
2. Include token in request headers: `Authorization: Bearer <token>`
3. Token expires after 7 days

---

## REST API Endpoints

### Authentication Endpoints

#### POST `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string (min 6 characters)"
}
```

**Success Response (201):**
```json
{
  "token": "jwt-token-string",
  "user": {
    "id": "user-id",
    "username": "string",
    "email": "string"
  }
}
```

**Error Responses:**
- `400` - Missing fields or password too short
- `400` - User already exists
- `500` - Registration failed

---

#### POST `/api/auth/login`

Login with existing credentials.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Success Response (200):**
```json
{
  "token": "jwt-token-string",
  "user": {
    "id": "user-id",
    "username": "string",
    "email": "string"
  }
}
```

**Error Responses:**
- `400` - Missing email or password
- `401` - Invalid credentials
- `500` - Login failed

---

#### GET `/api/auth/me`

Get current user information.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "user": {
    "id": "user-id",
    "username": "string",
    "email": "string"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `500` - Server error

---

### Whiteboard Endpoints

#### GET `/api/whiteboards`

Get all whiteboards accessible to the authenticated user (owned or collaborated).

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "whiteboards": [
    {
      "_id": "whiteboard-id",
      "roomId": "room-xyz",
      "name": "My Whiteboard",
      "owner": "user-id",
      "isProtected": true,
      "collaborators": [
        {
          "userId": "user-id",
          "email": "user@example.com",
          "username": "collaborator",
          "invitedAt": "2024-01-01T00:00:00.000Z"
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Note:** Strokes are excluded from list view for performance.

**Error Responses:**
- `401` - Unauthorized
- `500` - Failed to fetch whiteboards

---

#### GET `/api/whiteboards/:roomId`

Get a specific whiteboard by room ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Params:**
- `roomId` - The whiteboard room ID

**Success Response (200):**
```json
{
  "whiteboard": {
    "_id": "whiteboard-id",
    "roomId": "room-xyz",
    "name": "My Whiteboard",
    "owner": "user-id",
    "isProtected": true,
    "collaborators": [...],
    "strokes": [
      {
        "id": "stroke-id",
        "points": [
          { "x": 100, "y": 200 }
        ],
        "color": "#000000",
        "width": 2,
        "timestamp": 1234567890,
        "userId": "user-id",
        "tool": "pen",
        "shape": "freehand"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Access Control:**
- Users can access if they are the owner, a collaborator, or the whiteboard is public
- Guest users can access public whiteboards only

**Error Responses:**
- `401` - Unauthorized
- `403` - No access to this whiteboard
- `404` - Whiteboard not found
- `500` - Failed to fetch whiteboard

---

#### POST `/api/whiteboards`

Create a new whiteboard.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string (optional)",
  "isProtected": "boolean (optional, default: true)"
}
```

**Note:** If `name` is not provided, it will be auto-generated as "Whiteboard [date] [time]".

**Success Response (201):**
```json
{
  "whiteboard": {
    "_id": "whiteboard-id",
    "roomId": "room-auto-generated",
    "name": "Whiteboard 1/1/24 12:00 PM",
    "owner": "user-id",
    "isProtected": true,
    "collaborators": [],
    "strokes": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `500` - Failed to create whiteboard

---

#### PUT `/api/whiteboards/:roomId`

Update whiteboard name or protection status. **Only owner can update.**

**Headers:**
```
Authorization: Bearer <token>
```

**Params:**
- `roomId` - The whiteboard room ID

**Request Body:**
```json
{
  "name": "string (optional)",
  "isProtected": "boolean (optional)"
}
```

**Success Response (200):**
```json
{
  "whiteboard": {
    "_id": "whiteboard-id",
    "roomId": "room-xyz",
    "name": "Updated Name",
    "owner": "user-id",
    "isProtected": false,
    "collaborators": [...],
    "strokes": [...],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Only owner can update
- `404` - Whiteboard not found
- `500` - Failed to update whiteboard

---

#### DELETE `/api/whiteboards/:roomId`

Delete a whiteboard. **Only owner can delete.**

**Headers:**
```
Authorization: Bearer <token>
```

**Params:**
- `roomId` - The whiteboard room ID

**Success Response (200):**
```json
{
  "message": "Whiteboard deleted successfully"
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Only owner can delete
- `404` - Whiteboard not found
- `500` - Failed to delete whiteboard

---

#### POST `/api/whiteboards/:roomId/invite`

Invite a collaborator to the whiteboard. **Only owner can invite.**

**Headers:**
```
Authorization: Bearer <token>
```

**Params:**
- `roomId` - The whiteboard room ID

**Request Body:**
```json
{
  "email": "collaborator@example.com"
}
```

**Success Response (200):**
```json
{
  "whiteboard": { ...whiteboard data... },
  "message": "Collaborator invited successfully"
}
```

**Error Responses:**
- `400` - Email is required
- `400` - User is already a collaborator
- `400` - Owner cannot be invited as collaborator
- `401` - Unauthorized
- `403` - Only owner can invite
- `404` - Whiteboard not found / User not found
- `500` - Failed to invite collaborator

---

#### DELETE `/api/whiteboards/:roomId/collaborators/:collaboratorId`

Remove a collaborator from the whiteboard. **Only owner can remove.**

**Headers:**
```
Authorization: Bearer <token>
```

**Params:**
- `roomId` - The whiteboard room ID
- `collaboratorId` - The collaborator user ID

**Success Response (200):**
```json
{
  "whiteboard": { ...whiteboard data... },
  "message": "Collaborator removed successfully"
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Only owner can remove collaborators
- `404` - Whiteboard not found
- `500` - Failed to remove collaborator

---

## WebSocket Events

### Connection

Connect to the WebSocket server:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token' // Optional - for authenticated users
  }
});
```

### Whiteboard Events

#### Client → Server

##### `join-room`

Join a whiteboard room.

```javascript
socket.emit('join-room', 'room-xyz');
```

**Access Control:**
- Guests can join any public whiteboard
- Guests cannot access protected whiteboards
- Authenticated users can join if they are owner, collaborator, or whiteboard is public
- If whiteboard doesn't exist, it will be auto-created (public)

##### `draw-stroke`

Draw a stroke on the whiteboard.

```javascript
socket.emit('draw-stroke', {
  roomId: 'room-xyz',
  id: 'stroke-id',
  points: [
    { x: 100, y: 200 },
    { x: 150, y: 250 }
  ],
  color: '#000000',
  width: 2,
  timestamp: 1234567890,
  userId: 'user-id',
  tool: 'pen', // 'pen' | 'eraser' | 'highlighter'
  shape: 'freehand', // 'freehand' | 'line' | 'rectangle' | 'square' | 'circle'
  startPoint: { x: 100, y: 200 }, // Optional for shapes
  endPoint: { x: 150, y: 250 } // Optional for shapes
});
```

**Note:** Requires edit access to the whiteboard.

##### `clear-whiteboard`

Clear all strokes from the whiteboard.

```javascript
socket.emit('clear-whiteboard', 'room-xyz');
```

**Note:** Requires edit access to the whiteboard.

##### `undo-stroke`

Remove the last stroke from the whiteboard.

```javascript
socket.emit('undo-stroke', 'room-xyz');
```

**Note:** Requires edit access to the whiteboard.

#### Server → Client

##### `whiteboard-loaded`

Emitted when a whiteboard is loaded successfully.

```javascript
socket.on('whiteboard-loaded', (data) => {
  console.log(data);
  // {
  //   strokes: [...],
  //   roomId: 'room-xyz',
  //   name: 'My Whiteboard',
  //   isProtected: true,
  //   canEdit: true
  // }
});
```

##### `stroke-drawn`

Emitted when another user draws a stroke.

```javascript
socket.on('stroke-drawn', (stroke) => {
  // Add stroke to local canvas
  console.log(stroke);
});
```

##### `whiteboard-cleared`

Emitted when the whiteboard is cleared.

```javascript
socket.on('whiteboard-cleared', () => {
  // Clear local canvas
});
```

##### `stroke-undone`

Emitted when a stroke is undone.

```javascript
socket.on('stroke-undone', ({ strokeId }) => {
  // Remove stroke from local canvas
});
```

##### `user-joined`

Emitted when a user joins the room.

```javascript
socket.on('user-joined', ({ userId }) => {
  // Handle user join notification
});
```

##### `error`

Emitted when an error occurs.

```javascript
socket.on('error', ({ message }) => {
  console.error('Socket error:', message);
});
```

**Error Messages:**
- "Whiteboard not found"
- "You do not have access to this protected whiteboard"
- "You do not have permission to edit this whiteboard"
- "Failed to load whiteboard"
- "Failed to save stroke"
- "No strokes to undo"
- "Failed to clear whiteboard"
- "Failed to undo stroke"

---

### Chat Events

#### Client → Server

##### `join-chat-room`

Join a chat room for a whiteboard.

```javascript
socket.emit('join-chat-room', 'room-xyz');
```

##### `send-message`

Send a chat message.

```javascript
socket.emit('send-message', {
  roomId: 'room-xyz',
  userId: 'user-id',
  username: 'username',
  message: 'Hello, world!'
});
```

##### `leave-chat-room`

Leave a chat room.

```javascript
socket.emit('leave-chat-room', 'room-xyz');
```

#### Server → Client

##### `chat-history`

Emitted with chat history when joining a room.

```javascript
socket.on('chat-history', (messages) => {
  console.log(messages);
  // [
  //   {
  //     _id: 'message-id',
  //     roomId: 'room-xyz',
  //     userId: 'user-id',
  //     username: 'username',
  //     message: 'Hello!',
  //     timestamp: '2024-01-01T00:00:00.000Z'
  //   }
  // ]
});
```

##### `new-message`

Emitted when a new message is received.

```javascript
socket.on('new-message', (message) => {
  // Add message to chat
  console.log(message);
});
```

---

## Data Models

### User

```typescript
interface User {
  _id: string;
  username: string;
  email: string;
  password: string; // Hashed
  createdAt: Date;
  updatedAt: Date;
}
```

### Whiteboard

```typescript
interface Whiteboard {
  _id: string;
  roomId: string;
  name: string;
  owner: string; // User ID
  isProtected: boolean;
  collaborators: Collaborator[];
  strokes: Stroke[];
  createdAt: Date;
  updatedAt: Date;
}

interface Collaborator {
  userId: string;
  email: string;
  username: string;
  invitedAt: Date;
}

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  timestamp: number;
  userId: string;
  tool?: 'pen' | 'eraser' | 'highlighter';
  shape?: 'freehand' | 'line' | 'rectangle' | 'square' | 'circle';
  startPoint?: Point;
  endPoint?: Point;
}

interface Point {
  x: number;
  y: number;
}
```

### Chat Message

```typescript
interface ChatMessage {
  _id: string;
  roomId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
}
```

---

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created successfully
- `400` - Bad request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Internal server error

### Error Response Format

```json
{
  "error": "Error message"
}
```

### WebSocket Error Format

```json
{
  "message": "Error message"
}
```

---

## Access Control Summary

### Whiteboard Access

| Role | Public Whiteboard | Protected Whiteboard (Owner) | Protected Whiteboard (Collaborator) | Protected Whiteboard (Other) |
|------|------------------|------------------------------|-------------------------------------|-------------------------------|
| Guest | ✅ View & Edit | ❌ Denied | ❌ Denied | ❌ Denied |
| Authenticated (Owner) | ✅ View & Edit | ✅ View & Edit | N/A | N/A |
| Authenticated (Collaborator) | ✅ View & Edit | N/A | ✅ View & Edit | ❌ Denied |
| Authenticated (Other) | ✅ View & Edit | N/A | N/A | ❌ Denied |

### Operation Permissions

| Operation | Guest | Owner | Collaborator |
|-----------|-------|-------|--------------|
| Create whiteboard | ❌ | ✅ | ❌ |
| Update whiteboard | ❌ | ✅ | ❌ |
| Delete whiteboard | ❌ | ✅ | ❌ |
| Invite collaborator | ❌ | ✅ | ❌ |
| Remove collaborator | ❌ | ✅ | ❌ |
| Draw on public | ✅ | ✅ | ✅ |
| Draw on protected | ❌ | ✅ | ✅ |
| Clear whiteboard | ✅ (public) / ❌ (protected) | ✅ | ✅ |
| Undo stroke | ✅ (public) / ❌ (protected) | ✅ | ✅ |

---

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/whiteboard

# JWT Secret
JWT_SECRET=your-secret-key-here

# CORS
CORS_ORIGIN=http://localhost:3000
```

---

## Development

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

---

## License

MIT

