# Real-Time Collaboration Whiteboard

A real-time collaborative whiteboard application built with Next.js, Express.js, Socket.io, MongoDB, and Redux. Features WebSocket-based real-time synchronization, offline support with Service Workers, and a responsive UI with theme switching.

## Features

- 🎨 **Whiteboard-like Collaboration**: Draw and collaborate in real-time
- 🔄 **WebSocket Real-time Updates**: Instant synchronization using Socket.io
- 📱 **Offline Support**: Service Worker for offline functionality
- 🎨 **Theme Switching**: Light/Dark mode toggle
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🔌 **MongoDB Integration**: Persistent storage for whiteboard data

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
collaboration-tool/
├── frontend/          # Next.js frontend application
│   ├── app/           # Next.js app directory
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── store/       # Redux store and slices
│   │   └── lib/         # Utilities (socket, serviceWorker)
│   └── public/          # Static assets and Service Worker
│
└── backend/          # Express.js backend
    ├── src/
    │   ├── models/     # MongoDB models
    │   ├── socket/     # Socket.io handlers
    │   ├── config/     # Database configuration
    │   └── server.ts   # Express server
    └── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB database (or use MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd collaboration-tool
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
   PORT=3001
   MONGODB_URI=mongodb+srv://aditijain:<db_password>@productcluster.cbzsw7t.mongodb.net/?appName=productCluster
   CORS_ORIGIN=http://localhost:3000
   ```

   **Important**: Replace `<db_password>` with your actual MongoDB password.

2. **Frontend Environment Variables**

   Create a `.env.local` file in the `frontend/` directory:
   ```env
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
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

1. **Create or Join a Room**
   - Generate a new room ID or enter an existing room ID
   - Click "Join Room" to start collaborating

2. **Drawing**
   - Click and drag to draw on the whiteboard
   - Select colors from the toolbar
   - Adjust line width with the slider
   - Use touch on mobile devices

3. **Collaboration**
   - Share the room ID with others to collaborate in real-time
   - All drawings are synchronized across all connected users
   - Changes are saved to MongoDB

4. **Features**
   - **Clear**: Clear the entire whiteboard
   - **Undo**: Remove the last stroke
   - **Theme Toggle**: Switch between light and dark mode

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

## Environment Variables for Production

Update the environment variables with your production URLs:

**Backend `.env`:**
```env
PORT=3001
MONGODB_URI=your_production_mongodb_uri
CORS_ORIGIN=https://your-frontend-domain.com
```

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_SOCKET_URL=https://your-backend-domain.com
```

## License

MIT

