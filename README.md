# Real-Time Collaboration Whiteboard

A real-time collaborative whiteboard application built with Next.js, Express.js, Socket.io, MongoDB, and Redux. Features WebSocket-based real-time synchronization and offline support with Service Workers.

## Features

- 🎨 **Whiteboard-like Collaboration**: Draw and collaborate in real-time
- 🔄 **WebSocket Real-time Updates**: Instant synchronization using Socket.io
- 📱 **Offline Support**: Service Worker for offline functionality
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

### Frontend
- Next.js 16 (App Router)
- React 19
- Redux Toolkit
- Socket.io Client
- Tailwind CSS
- TypeScript

### Backend
- Express.js
- Socket.io
- MongoDB (Mongoose)
- TypeScript

## Project Structure

```
Sketchify/
├── docs/              # Project documentation (backend APIs, flows, frontend, sockets)
│   ├── backend-api.md
│   ├── backend-flows.md
│   ├── frontend-flows.md
│   └── sockets.md
├── frontend/          # Next.js frontend application
│   ├── app/           # App Router entry points
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── store/       # Redux store and slices
│   │   └── lib/         # REST + socket utilities, service worker helpers
│   └── public/          # Static assets and Service Worker
│
└── backend/           # Express.js backend
    ├── src/
    │   ├── models/     # MongoDB models
    │   ├── socket/     # Socket.io handlers
    │   ├── middleware/ # Auth + socket middleware
    │   ├── routes/     # REST endpoints
    │   └── server.ts   # Express server bootstrap
    └── package.json
```

## Documentation

The `docs/` directory contains curated references for extending and operating Sketchify:

- `docs/backend-api.md` — REST endpoints, payloads, and error semantics.
- `docs/backend-flows.md` — Authentication, whiteboard lifecycles, and collaboration flows.
- `docs/frontend-flows.md` — App routing, Redux orchestration, and UI responsibilities.
- `docs/sockets.md` — Socket.IO event contracts for whiteboard and chat channels.

Refer to these files before modifying APIs, sockets, or front-end flows to keep changes consistent.

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB database (or use MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd Sketchify
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

### Configuration

1. **Backend Environment Variables**

   Create a `.env` file in the `backend/` directory:
   ```env
   MONGODB_URI=mongodb+srv://<userName>:<db_password>@mongoURI
   DB_PASSWORD=<mongoDbPassword>
   JWT_SECRET=JWTmongoPasswordKey
   PORT=3001
   CORS_ORIGIN=http://localhost:3000
   ```

   **Important**: Replace `<mongoDbPassword>` with your actual MongoDB password.

2. **Frontend Environment Variables**

   Create a `.env.local` file in the `frontend/` directory:
   ```env
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   The server will start on `http://localhost:3001`

2. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will start on `http://localhost:3000`

3. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

1. **Create or Open an existing Whiteboard**
   - If not login then click on "Continue as Guest" to open whiteboard.
   - If login then:
      - Click "+ New Whiteboard" to create and start collaborating
      - Click on "Open" button on any existing whiteboard from the listing.

2. **Drawing**
   - Click and drag to draw on the whiteboard
   - Select colors, tools from the toolbar

3. **Collaboration**
   - Either make whiteboard public from settings or add emails of users to add them as collaborator
   - All drawings are synchronized across all connected users
   - Changes are saved to MongoDB

## Service Worker (Offline Support)

The application includes a Service Worker that:
- Caches essential resources
- Provides offline functionality
- Shows an offline page when the network is unavailable
- Automatically registers on page load

## Production Build

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
npm start
```