# Authentication System Documentation

## Overview

The collaboration tool now includes a complete authentication system using JWT (JSON Web Tokens) for secure user sessions. Users can register, login, or continue as guests.

## How Authentication Works

### 1. User Registration/Login
- Users can register with username, email, and password (min 6 characters)
- Users can login with email and password
- Passwords are hashed using bcryptjs before storage
- JWT tokens are generated and stored in localStorage

### 2. Guest Mode
- Users can continue as guests without authentication
- Guest users get auto-generated usernames (e.g., "Guest123456")
- No data persistence for guest users

### 3. Socket Authentication
- When authenticated, users send their JWT token in socket connection
- Server validates token and attaches user info to socket
- Authenticated users use their registered username
- Guest users use auto-generated usernames

### 4. Chat Username Management
- **Authenticated users**: Use their registered username from the database
- **Guest users**: Use auto-generated username (e.g., "Guest123456")
- Username is set automatically based on authentication status

## Backend Implementation

### Files Created:
1. **`backend/src/models/User.ts`** - User model with password hashing
2. **`backend/src/routes/auth.ts`** - Authentication routes (register/login)
3. **`backend/src/middleware/auth.ts`** - JWT middleware for HTTP requests
4. **`backend/src/middleware/socketAuth.ts`** - Socket authentication middleware

### API Endpoints:
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Socket Authentication:
- Token sent via `socket.handshake.auth.token`
- Server validates and attaches user info to socket
- Falls back to guest mode if token is invalid/missing

## Frontend Implementation

### Files Created:
1. **`frontend/src/store/slices/authSlice.ts`** - Redux slice for auth state
2. **`frontend/src/lib/auth.ts`** - API functions for authentication
3. **`frontend/src/components/Auth.tsx`** - Login/Register UI component

### Updated Files:
- `frontend/src/lib/socket.ts` - Now sends token in socket connection
- `frontend/src/components/Chat.tsx` - Uses authenticated username
- `frontend/app/page.tsx` - Shows auth screen first

## Installation Required

Run these commands in the backend directory:

```bash
npm install bcryptjs jsonwebtoken
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
```

## Environment Variables

Add to `.env` file in backend:

```
JWT_SECRET=your-secret-key-here
```

## How to Use

1. **Register/Login**: Users see auth screen first
2. **Guest Mode**: Click "Continue as Guest" to skip authentication
3. **Authenticated**: After login, username is used automatically in chat
4. **Token Storage**: JWT token stored in localStorage for persistence

## Username Priority

1. If user is authenticated → Use registered username from database
2. If user is guest → Use auto-generated "Guest[ID]" username
3. Chat component automatically uses the correct username

## Security Features

- Passwords hashed with bcryptjs (10 salt rounds)
- JWT tokens expire after 7 days
- Token validation on every socket connection
- Protected API routes with authentication middleware

