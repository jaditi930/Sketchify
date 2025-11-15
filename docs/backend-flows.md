# Backend Flow Guide

## Topics
- [Key Components](#key-components)
- [Request Lifecycle](#request-lifecycle)
- [Authentication Flow](#authentication-flow)
- [Whiteboard Lifecycle](#whiteboard-lifecycle)
- [Collaboration Flow](#collaboration-flow)
- [Guest & Socket-Created Boards](#guest--socket-created-boards)
- [Data Persistence Notes](#data-persistence-notes)

## Key Components
- **Server bootstrap** — `backend/src/server.ts` wires Express, creates the HTTP server, and mounts Socket.IO on top of it.
- **Data models** — `User`, `Whiteboard`, and `ChatMessage` live under `backend/src/models/` and map directly to MongoDB collections.
- **Middleware** — `backend/src/middleware/auth.ts` (REST JWT guard) and `backend/src/middleware/socketAuth.ts` (optional socket identity) provide shared auth logic.

## Request Lifecycle
1. `dotenv` loads environment variables, then `connectDB()` opens the MongoDB connection.
2. Global middleware runs: CORS with credentials, JSON body parsing, and the `/health` probe.
3. Feature routers mount:
   - `/api/auth` for login, registration, and profile lookup.
   - `/api/whiteboards` for CRUD and collaborator management (REST endpoints always require a valid JWT).
4. Each route wraps critical operations in `try/catch`, logging errors before responding with the appropriate status code.

## Authentication Flow
- **Register** — Incoming payloads are validated, then passwords hash via the `User` model’s `pre('save')` bcrypt hook.
- **Token issuing** — `generateToken()` signs a 7-day JWT used in both registration and login responses.
- **Session refresh** — `GET /api/auth/me` passes through the `authenticate` middleware, ensuring the JWT is valid and the user still exists before returning profile data.
- **Failure paths** — Missing/invalid tokens short-circuit with `401`, keeping downstream route handlers free from repeated auth checks.

## Whiteboard Lifecycle
1. **Create (`POST /api/whiteboards`)** — Generates a unique 8-character `roomId` loop until no collision exists. Boards default to `isProtected=true`.
2. **Read (`GET /api/whiteboards/:roomId`)** — Allows access for owners, collaborators, or any authenticated user when `isProtected=false`.
3. **List (`GET /api/whiteboards`)** — Returns lightweight metadata for boards where the requester is owner or collaborator (no stroke payloads).
4. **Update (`PUT /api/whiteboards/:roomId`)** — Owner-only. Updates name/protection flags and saves changes for downstream socket sessions to pick up.
5. **Delete (`DELETE /api/whiteboards/:roomId`)** — Owner-only. Removes the document; chat history persists unless future cleanup is implemented.

## Collaboration Flow
- **Invite (`POST .../:roomId/invite`)** — Owner submits an email, the backend resolves it to a `User`, and appends collaborator metadata (`userId`, `email`, `username`, `invitedAt`). Duplicate invites and self-invites are blocked.
- **Remove (`DELETE .../:roomId/collaborators/:collaboratorId`)** — Owner filters out the collaborator by `userId` and saves the board. Responses echo the updated whiteboard to keep the frontend in sync.

## Guest & Socket-Created Boards
- REST endpoints require JWT authentication; unauthenticated guests cannot call `/api/whiteboards`.
- Guests join rooms exclusively through Socket.IO (`join-room`). If the requested `roomId` does not exist, `setupWhiteboardSocket` creates a public board owned by `'guest'`.
- Authenticated users who join an empty room through the socket become the owner because their `socket.userId` is persisted.
- Guest-owned boards stay editable but hide privileged UI (chat, collaborator management) on the frontend.

## Data Persistence Notes
- **Whiteboard strokes** — Stored inline on the `Whiteboard` document. Socket handlers (`draw-stroke`, `clear-whiteboard`, `undo-stroke`) mutate these arrays.
- **Indexes** — Whiteboards index `{ roomId, owner }`, chat messages index `{ roomId, timestamp }`, and users index `{ username, email }` for fast lookups.
- **Atomic operations** — Most updates use `whiteboard.save()`. Undo relies on `updateOne` with Mongo’s `$pop` to atomically remove the last stroke while updating `updatedAt`.