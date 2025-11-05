# Task Management System

Real-time collaborative task management system built with NestJS, Next.js, PostgreSQL, MongoDB, and Redis.

## Tech Stack

**Backend:** NestJS, TypeScript, PostgreSQL (TypeORM), MongoDB (Mongoose), Redis, WebSockets  
**Frontend:** Next.js 16, React, TypeScript, Tailwind CSS, React Query, Socket.IO Client

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL (local or Docker)
- MongoDB (local or Docker)
- Redis (local or Docker)

### Option 1: Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Option 2: Local Development

**Backend:**
```bash
cd backend
npm install
cp .env.example .env  # Update with your database credentials
npm run start:dev
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.local.example .env.local  # Set NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev
```

## Environment Variables

**Backend (.env):**
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-secret-key
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=123
POSTGRES_DB=taskdb
MONGODB_URI=mongodb://localhost:27017/tasklogs
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

## API Endpoints

**Auth:**
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token

**Tasks:**
- `GET /tasks` - Get all tasks (filtered by permissions)
- `POST /tasks` - Create task
- `GET /tasks/:id` - Get task by ID
- `PATCH /tasks/:id` - Update task
- `PATCH /tasks/:id/assign` - Assign/unassign task
- `DELETE /tasks/:id` - Delete task

**Users:**
- `GET /users` - Get all users (Admin only)
- `GET /users/:id` - Get user by ID
- `PATCH /users/profile` - Update own profile

## Features

- ✅ JWT Authentication & Authorization (RBAC)
- ✅ Real-time updates via WebSockets
- ✅ Redis caching with auto-invalidation
- ✅ MongoDB event logging
- ✅ Responsive UI
- ✅ Unit tests (Jest)

## Project Structure

```
.
├── backend/          # NestJS API
│   ├── src/
│   │   ├── auth/     # Authentication
│   │   ├── users/    # User management
│   │   ├── tasks/    # Task CRUD
│   │   └── events/   # WebSocket & logging
│   └── package.json
│
├── frontend/         # Next.js App
│   ├── app/          # Pages & routes
│   ├── components/   # React components
│   ├── context/      # Auth & Socket contexts
│   └── package.json
│
└── docker-compose.yml
```


