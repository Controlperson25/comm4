// server/websocket/server.ts
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import { parse } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { validateEnvironment, env } from '../lib/config/environment'
import { messageRateLimiter } from '../lib/security/validation'

interface ClientConnection {
  id: string
  ws: WebSocket
  userId?: string
  username?: string
  roomId?: string
  lastPing: number
  isAlive: boolean
}

interface Room {
  id: string
  clients: Set<string>
  createdAt: number
  lastActivity: number
}

interface WebSocketMessage {
  type: 'message' | 'typing' | 'user_joined' | 'user_left' | 'ping' | 'pong' | 'join_room'
  roomId?: string
  userId?: string
  username?: string
  data?: any
  timestamp?: string
  id?: string
}

class WebSocketChatServer {
  private wss: WebSocketServer
  private server: any
  private clients: Map<string, ClientConnection> = new Map()
  private rooms: Map<string, Room> = new Map()
  private heartbeatInterval: NodeJS.Timeout
  private cleanupInterval: NodeJS.Timeout
  
  constructor(port: number = 3001) {
    // Validate environment
    validateEnvironment()
    
    // Create HTTP server
    this.server = createServer()
    
    // Create WebSocket server
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/ws'
    })
    
    this.setupEventHandlers()
    this.startHeartbeat()
    this.startCleanup()
    
    // Start server
    this.server.listen(port, () => {
      console.log(`🚀 WebSocket server running on port ${port}`)
    })
  }
  
  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = uuidv4()
      const ip = request.socket.remoteAddress
      
      console.log(`📱 Client connected: ${clientId} from ${ip}`)
      
      // Create client connection
      const client: ClientConnection = {
        id: clientId,
        ws,
        lastPing: Date.now(),
        isAlive: true
      }
      
      this.clients.set(clientId, client)
      
      // Setup client event handlers
      ws.on('message', (data) => {
        this.handleMessage(clientId, data)
      })
      
      ws.on('close', () => {
        this.handleDisconnect(clientId)
      })
      
      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for client ${clientId}:`, error)
        this.handleDisconnect(clientId)
      })
      
      ws.on('pong', () => {
        const client = this.clients.get(clientId)
        if (client) {
          client.isAlive = true
          client.lastPing = Date.now()
        }
      })
      
      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connection',
        data: { clientId, timestamp: new Date().toISOString() }
      })
    })
    
    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error)
    })
  }
  
  private handleMessage(clientId: string, rawData: any): void {
    const client = this.clients.get(clientId)
    if (!client) return
    
    try {
      const message: WebSocketMessage = JSON.parse(rawData.toString())
      
      // Rate limiting
      const rateLimitKey = `${clientId}:${message.type}`
      if (!messageRateLimiter.isAllowed(rateLimitKey)) {
        this.sendToClient(clientId, {
          type: 'error',
          data: { message: 'Rate limit exceeded' }
        })
        return
      }
      
      // Handle different message types
      switch (message.type) {
        case 'join_room':
          this.handleJoinRoom(clientId, message)
          break
          
        case 'message':
          this.handleChatMessage(clientId, message)
          break
          
        case 'typing':
          this.handleTyping(clientId, message)
          break
          
        case 'ping':
          this.handlePing(clientId, message)
          break
          
        default:
          console.warn(`🤷 Unknown message type: ${message.type}`)
      }
      
    } catch (error) {
      console.error(`❌ Failed to parse message from ${clientId}:`, error)
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Invalid message format' }
      })
    }
  }
  
  private handleJoinRoom(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId)
    if (!client || !message.roomId || !message.userId || !message.username) return
    
    // Leave current room if any
    if (client.roomId) {
      this.leaveRoom(clientId, client.roomId)
    }
    
    // Update client info
    client.userId = message.userId
    client.username = message.username
    client.roomId = message.roomId
    
    // Create room if it doesn't exist
    if (!this.rooms.has(message.roomId)) {
      this.rooms.set(message.roomId, {
        id: message.roomId,
        clients: new Set(),
        createdAt: Date.now(),
        lastActivity: Date.now()
      })
    }
    
    const room = this.rooms.get(message.roomId)!
    room.clients.add(clientId)
    room.lastActivity = Date.now()
    
    console.log(`👤 ${message.username} joined room ${message.roomId}`)
    
    // Notify other clients in the room
    this.broadcastToRoom(message.roomId, {
      type: 'user_joined',
      roomId: message.roomId,
      userId: message.userId,
      username: message.username,
      timestamp: new Date().toISOString()
    }, clientId)
    
    // Send confirmation to client
    this.sendToClient(clientId, {
      type: 'room_joined',
      roomId: message.roomId,
      data: {
        participants: this.getRoomParticipants(message.roomId)
      }
    })
  }
  
  private handleChatMessage(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId)
    if (!client || !client.roomId || !message.data?.content) return
    
    const room = this.rooms.get(client.roomId)
    if (!room) return
    
    room.lastActivity = Date.now()
    
    // Create message object
    const chatMessage = {
      type: 'message',
      roomId: client.roomId,
      userId: client.userId,
      username: client.username,
      data: {
        id: message.id || uuidv4(),
        content: message.data.content,
        senderId: client.userId,
        senderName: client.username,
        type: message.data.type || 'text',
        encrypted: message.data.encrypted || false
      },
      timestamp: new Date().toISOString()
    }
    
    console.log(`💬 Message from ${client.username} in room ${client.roomId}`)
    
    // Broadcast to all clients in room
    this.broadcastToRoom(client.roomId, chatMessage)
  }
  
  private handleTyping(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId)
    if (!client || !client.roomId) return
    
    const room = this.rooms.get(client.roomId)
    if (!room) return
    
    // Broadcast typing indicator to other clients
    this.broadcastToRoom(client.roomId, {
      type: 'typing',
      roomId: client.roomId,
      userId: client.userId,
      username: client.username,
      data: { typing: message.data?.typing || false },
      timestamp: new Date().toISOString()
    }, clientId)
  }
  
  private handlePing(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId)
    if (!client) return
    
    client.lastPing = Date.now()
    client.isAlive = true
    
    // Send pong response
    this.sendToClient(clientId, {
      type: 'pong',
      timestamp: new Date().toISOString()
    })
  }
  
  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId)
    if (!client) return
    
    console.log(`📱 Client disconnected: ${clientId}`)
    
    // Leave room if in one
    if (client.roomId) {
      this.leaveRoom(clientId, client.roomId)
    }
    
    // Remove client
    this.clients.delete(clientId)
  }
  
  private leaveRoom(clientId: string, roomId: string): void {
    const client = this.clients.get(clientId)
    const room = this.rooms.get(roomId)
    
    if (!client || !room) return
    
    room.clients.delete(clientId)
    
    // Notify other clients
    if (client.userId && client.username) {
      this.broadcastToRoom(roomId, {
        type: 'user_left',
        roomId,
        userId: client.userId,
        username: client.username,
        timestamp: new Date().toISOString()
      }, clientId)
    }
    
    // Clean up empty room
    if (room.clients.size === 0) {
      this.rooms.delete(roomId)
      console.log(`🗑️  Room ${roomId} deleted (empty)`)
    }
    
    client.roomId = undefined
  }
  
  private sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId)
    if (!client || client.ws.readyState !== WebSocket.OPEN) return
    
    try {
      client.ws.send(JSON.stringify(message))
    } catch (error) {
      console.error(`❌ Failed to send message to client ${clientId}:`, error)
    }
  }
  
  private broadcastToRoom(roomId: string, message: any, excludeClientId?: string): void {
    const room = this.rooms.get(roomId)
    if (!room) return
    
    room.clients.forEach(clientId => {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message)
      }
    })
  }
  
  private getRoomParticipants(roomId: string): any[] {
    const room = this.rooms.get(roomId)
    if (!room) return []
    
    const participants: any[] = []
    room.clients.forEach(clientId => {
      const client = this.clients.get(clientId)
      if (client && client.userId && client.username) {
        participants.push({
          id: client.userId,
          username: client.username,
          isOnline: true
        })
      }
    })
    
    return participants
  }
  
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          console.log(`💀 Terminating dead client: ${clientId}`)
          client.ws.terminate()
          this.handleDisconnect(clientId)
          return
        }
        
        client.isAlive = false
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping()
        }
      })
    }, 30000) // 30 seconds
  }
  
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      const roomTimeout = 60 * 60 * 1000 // 1 hour
      
      // Clean up inactive rooms
      this.rooms.forEach((room, roomId) => {
        if (now - room.lastActivity > roomTimeout) {
          console.log(`🗑️  Cleaning up inactive room: ${roomId}`)
          this.rooms.delete(roomId)
        }
      })
      
      // Clean up dead clients
      this.clients.forEach((client, clientId) => {
        if (now - client.lastPing > 60000) { // 1 minute
          console.log(`🗑️  Cleaning up inactive client: ${clientId}`)
          this.handleDisconnect(clientId)
        }
      })
      
    }, 5 * 60 * 1000) // 5 minutes
  }
  
  public getStats() {
    return {
      clients: this.clients.size,
      rooms: this.rooms.size,
      timestamp: new Date().toISOString()
    }
  }
  
  public shutdown(): void {
    console.log('🛑 Shutting down WebSocket server...')
    
    clearInterval(this.heartbeatInterval)
    clearInterval(this.cleanupInterval)
    
    // Close all client connections
    this.clients.forEach((client) => {
      client.ws.close(1000, 'Server shutdown')
    })
    
    this.wss.close(() => {
      this.server.close(() => {
        console.log('✅ WebSocket server shut down')
      })
    })
  }
}

// Start server
const server = new WebSocketChatServer(env.PORT + 1)

// Graceful shutdown
process.on('SIGTERM', () => server.shutdown())
process.on('SIGINT', () => server.shutdown())

export default server

// Dockerfile
/*
# Frontend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the app
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
*/

// docker-compose.yml
/*
version: '3.8'

services:
  # Next.js Application
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=http://localhost:3000
      - NEXT_PUBLIC_API_URL=http://localhost:3000
      - NEXT_PUBLIC_WS_URL=ws://localhost:3001
      - NEXT_PUBLIC_MATRIX_HOMESERVER=https://matrix.org
      - NEXT_PUBLIC_MATRIX_SERVER_NAME=matrix.org
    volumes:
      - ./uploads:/app/public/uploads
    depends_on:
      - websocket
      - redis
    restart: unless-stopped

  # WebSocket Server
  websocket:
    build:
      context: .
      dockerfile: Dockerfile.websocket
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    restart: unless-stopped

  # Redis for session storage
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
      - websocket
    restart: unless-stopped

volumes:
  redis_data:
*/

// nginx.conf
/*
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }
    
    upstream websocket {
        server websocket:3001;
    }

    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    server {
        listen 80;
        server_name localhost;

        # Security headers
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";

        # Main application
        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # WebSocket
        location /ws {
            proxy_pass http://websocket;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location /uploads {
            proxy_pass http://app;
            expires 1d;
            add_header Cache-Control "public, immutable";
        }
    }
}
*/

// package.json updates
/*
{
  "name": "act_talk_project",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "dev:ws": "tsx watch server/websocket/server.ts",
    "dev:all": "concurrently \"npm run dev\" \"npm run dev:ws\"",
    "build": "next build",
    "start": "next start",
    "start:ws": "node dist/server/websocket/server.js",
    "start:all": "concurrently \"npm start\" \"npm run start:ws\"",
    "lint": "next lint",
    "build:server": "tsc --project tsconfig.server.json",
    "docker:build": "docker build -t act-talk .",
    "docker:run": "docker-compose up -d",
    "docker:stop": "docker-compose down"
  },
  "dependencies": {
    "@hookform/resolvers": "^5.2.1",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-progress": "^1.1.7",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slot": "^1.2.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "isomorphic-dompurify": "^2.14.0",
    "lucide-react": "^0.536.0",
    "matrix-js-sdk": "^32.4.0",
    "next": "15.4.5",
    "next-themes": "^0.4.6",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-hook-form": "^7.62.0",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.3.1",
    "uuid": "^10.0.0",
    "ws": "^8.18.0",
    "zod": "^4.0.14",
    "zustand": "^5.0.7"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/uuid": "^10.0.0",
    "@types/ws": "^8.5.12",
    "concurrently": "^8.2.2",
    "eslint": "^9",
    "eslint-config-next": "15.4.5",
    "tailwindcss": "^4",
    "tsx": "^4.7.1",
    "tw-animate-css": "^1.3.6",
    "typescript": "^5"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
*/