
# Realtime Socket Architecture

## Topics
- [Socket Entry Points](#socket-entry-points)
- [Authentication & Identity](#authentication--identity)
- [Whiteboard Channel](#whiteboard-channel)
- [Chat Channel](#chat-channel)
- [Error Handling & Resilience](#error-handling--resilience)
- [Extending the Protocol](#extending-the-protocol)

## Socket Entry Points
- Socket.IO server is initialised in `backend/src/server.ts` and shares the HTTP server with Express routes.
- Middleware `io.use(authenticateSocket)` executes for every connection to attach `userId`, `username`, and `email` when a valid JWT is supplied via `handshake.auth.token` or `Authorization` header.
- Frontend clients call `getSocket(token?)` in `frontend/src/lib/socket.ts`, reusing a singleton connection and reconnecting automatically when the token changes.

## Authentication & Identity
- Authenticated users send `handshake.auth.token`; on success, socket context includes Mongo-backed identity so the server can persist ownership and attribute strokes/messages.
- Guests connect without a token. They receive generated usernames (`Guest<id>`) and have limited abilities:
  - Can view/participate in public boards.
  - Cannot edit protected boards (`canEdit` checks fail).
  - Cannot create collaborators or access chat on guest-owned boards (frontend hides UI, backend still validates permissions).

## Whiteboard Channel
All events handled in `backend/src/socket/whiteboardSocket.ts` and consumed by `frontend/src/components/Whiteboard.tsx`.

| Event | Direction | Payload | Notes |
|-------|-----------|---------|-------|
| `join-room` | client → server | `roomId: string` | Loads or auto-creates board; server responds with `whiteboard-loaded` on success. |
| `whiteboard-loaded` | server → client | `{ strokes, roomId, name, isProtected, canEdit }` | Frontend seeds Redux state and determines editing rights. |
| `draw-stroke` | client → server | `{ roomId, id, points, color, width, timestamp, userId, tool?, shape?, startPoint?, endPoint? }` | Server validates edit rights, appends stroke, and emits `stroke-drawn` to peers. |
| `stroke-drawn` | server → room | `Stroke` | Peers append strokes unless it matches their own `userId`. |
| `clear-whiteboard` | client → server | `roomId: string` | Requires edit rights; clears strokes and emits `whiteboard-cleared`. |
| `whiteboard-cleared` | server → room | none | Clients wipe local strokes. |
| `undo-stroke` | client → server | `roomId: string` | Removes last stroke atomically via `$pop`; emits `stroke-undone` to room. |
| `stroke-undone` | server → room | `{ strokeId?: string }` | Allows clients to drop the last stroke in state. |
| `user-joined` | server → room | `{ userId: socket.id }` | Optional hook for presence UI (not surfaced in current frontend). |
| `error` | server → client | `{ message }` | Fired when access or persistence fails. Frontend listens globally to show toasts.

## Chat Channel
Defined in `backend/src/socket/chatSocket.ts` and consumed by `frontend/src/components/Chat.tsx`.

| Event | Direction | Payload | Notes |
|-------|-----------|---------|-------|
| `join-chat-room` | client → server | `roomId: string` | Joins `chat-${roomId}` namespace and triggers history fetch. |
| `chat-history` | server → client | `ChatMessage[]` | Returns up to 50 most recent messages ordered oldest → newest. |
| `send-message` | client → server | `{ roomId, userId, username, message }` | Server validates message content, normalises identity from socket context, saves to Mongo, and emits `new-message`. |
| `new-message` | server → room | `{ _id, roomId, userId, username, message, timestamp }` | Appends to chat pane; Redux stores log for the session. |
| `leave-chat-room` | client → server | `roomId: string` | Removes socket from `chat-${roomId}` room to avoid lingering updates. |
| `error` | server → client | `{ message }` | Includes validation failures (empty message) or persistence errors.

## Error Handling & Resilience
- Socket middleware catches JWT failures and logs them, but still allows guest connections.
- Network retries: `getSocket()` enables reconnection attempts (5 tries, 1s delay). Frontend listens for `connect`/`disconnect` to toggle UI connectivity indicators.
- Critical failures emit `error` events; room-level errors (e.g., protected board access) also dispatch browser events (`window.dispatchEvent('socket-error')`) for page-level handling.
