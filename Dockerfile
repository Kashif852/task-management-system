FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/
WORKDIR /app/backend

# Install dependencies
RUN npm ci

# Copy backend source code
COPY backend/ ./

# Build the application
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app/backend

# Copy package files
COPY backend/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/backend/dist ./dist

EXPOSE 3001

CMD ["node", "dist/main"]

