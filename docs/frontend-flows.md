# Frontend Flow Guide

## Topics
- [Architecture Map](#architecture-map)
- [Routing & Page Shell](#routing--page-shell)
- [State Management Model](#state-management-model)
- [Auth & Session Handling](#auth--session-handling)
- [Whiteboard Experience](#whiteboard-experience)
- [Chat Experience](#chat-experience)
- [Offline & Resilience](#offline--resilience)
- [Developer Checklist](#developer-checklist)

## Architecture Map
- **Runtime** — Next.js App Router (`frontend/app`) hosts the routes; React components live in `frontend/src/components`.
- **State** — Redux Toolkit store (`frontend/src/store`) unifies auth, whiteboard, chat, and theme slices. Hooks in `store/hooks.ts` wrap `useDispatch`/`useSelector`.
- **Shared utilities** — `frontend/src/lib` contains REST wrappers (`auth.ts`, `whiteboards.ts`), socket helpers (`socket.ts`), and the service worker registrar.

## Routing & Page Shell
- `app/layout.tsx` renders global HTML structure, theme classes, and mounts `<Providers />` (Redux + theme context).
- `app/page.tsx`
  - Shows the `Auth` screen for anonymous users.
  - Offers “Continue as Guest” which flips to guest mode and redirects to a generated room.
  - Displays `WhiteboardList` when the user is authenticated.
- `app/[roomId]/page.tsx`
  - Loads the active board, verifies access (if authenticated), and sets Redux `roomId`.
  - Mounts `Toolbar`, `Whiteboard`, `OrientationPrompt`, and conditionally `Chat`.
  - Handles “Back to list” for authenticated owners.

## State Management Model
- **authSlice** — Stores `{ token, user, isAuthenticated }` and tracks loading/error states. Updated by login/register flows and `AuthInitializer`.
- **whiteboardSlice** — Holds drawing data (`strokes`, `tool`, `shape`, etc.), session metadata (`roomId`, `whiteboardOwner`, `isConnected`), and UI prefs (`backgroundType`).
- **chatSlice** — Keeps `messages`, `isConnected`, `username` fallback, and local input state.
- Components respond to socket events by dispatching slice actions, keeping rendering declarative and serializable.

## Auth & Session Handling
- `Auth` component submits login/register forms to `lib/auth.ts` and persists the returned JWT to `localStorage`.
- `AuthInitializer` runs once on load:
  - Reads stored token, sets it in Redux, and calls `/api/auth/me`.
  - On success, hydrates `authSlice` and reconnects the shared Socket.IO client with the fresh token.
  - On failure, clears the token and leaves the user in guest mode.
- Guest mode skips REST calls entirely; the app still sets a temporary `roomId` and joins sockets without a token.

## Whiteboard Experience
- `Whiteboard` component
  - Gets the singleton socket via `getSocket()` and emits `join-room`.
  - Listens to `whiteboard-loaded`, `stroke-drawn`, `whiteboard-cleared`, and `stroke-undone` events, reducing them into Redux.
  - Translates pointer/touch gestures into `startStroke` → `updateStroke` → `endStroke` actions; finished strokes emit `draw-stroke`.
  - Renders strokes on an off-screen canvas before compositing, so eraser/highlighter tools do not damage the white background.
- `Toolbar` exposes tool switching, stroke width, background variants, undo/clear, theme toggle, and navigation for authenticated owners.
- `WhiteboardList` fetches boards via `lib/whiteboards.ts` and provides create/open actions for signed-in users.

## Chat Experience
- `Chat` subscribes to the same socket instance and joins `chat-${roomId}` rooms.
- On connect, it fetches the latest 50 messages via `chat-history` and appends real-time updates from `new-message`.
- Sending a message emits `send-message` with `roomId`, `userId`, and `username`; the server normalises identity using the socket context when available.
- UI gates chat to authenticated boards whose owner is not `'guest'`; guests attempting to send receive socket error events logged in the console.

## Offline & Resilience
- `lib/serviceWorker.ts` registers `public/sw.js`, which caches static assets and serves `offline.html` when the network is down.
- `socket.ts` enables reconnection with exponential delay (five attempts). Redux flags (`isConnected`, `setChatConnected`) drive UX indicators.
- Most actions in the canvas are optimistic; if the server rejects a stroke (e.g., permission denied), the socket `error` event triggers a cleanup by reloading strokes on the next `whiteboard-loaded`.