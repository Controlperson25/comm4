// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { matrixClient } from '@/lib/matrix/client'

const registerSchema = z.object({
  username: z.string().min(2).max(20).regex(/^[a-zA-Z0-9_-]+$/),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username } = registerSchema.parse(body)
    
    // Register as guest user in Matrix
    const matrixAuth = await matrixClient.registerGuest()
    
    // Create user object
    const user = {
      id: matrixAuth.userId,
      username: username,
      matrixUserId: matrixAuth.userId,
      createdAt: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      data: {
        user,
        auth: {
          userId: matrixAuth.userId,
          accessToken: matrixAuth.accessToken, 
          deviceId: matrixAuth.deviceId
        }
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    )
  }
}

// src/app/api/rooms/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { matrixClient } from '@/lib/matrix/client'

const createRoomSchema = z.object({
  pinCode: z.string().length(4).regex(/^\d{4}$/),
  username: z.string().min(2).max(20),
  expirationMinutes: z.number().min(5).max(1440).default(60),
  encrypted: z.boolean().default(true)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pinCode, username, expirationMinutes, encrypted } = createRoomSchema.parse(body)
    
    // Initialize Matrix client if needed
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      )
    }
    
    const accessToken = authHeader.replace('Bearer ', '')
    
    // Create Matrix room
    const room = await matrixClient.createRoom({
      name: `ActTalk-${pinCode}`,
      topic: `Private chat room with PIN ${pinCode}`,
      pinCode,
      encrypted,
      expirationMinutes
    })
    
    return NextResponse.json({
      success: true,
      data: {
        room: {
          id: room.id,
          name: room.name,
          pinCode: room.pinCode,
          expiresAt: room.expiresAt,
          matrixRoomId: room.matrixRoomId,
          encrypted,
          participants: []
        }
      }
    })
  } catch (error) {
    console.error('Room creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create room' },
      { status: 500 }
    )
  }
}

// src/app/api/rooms/join/route.ts  
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { matrixClient } from '@/lib/matrix/client'

const joinRoomSchema = z.object({
  roomId: z.string().min(1),
  pinCode: z.string().length(4).regex(/^\d{4}$/),
  username: z.string().min(2).max(20)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId, pinCode, username } = joinRoomSchema.parse(body)
    
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      )
    }
    
    // Join Matrix room with PIN validation
    const room = await matrixClient.joinRoom(roomId, pinCode)
    
    return NextResponse.json({
      success: true,
      data: {
        room: {
          id: room.id,
          name: room.name,
          participants: room.participants,
          expiresAt: room.expiresAt,
          matrixRoomId: room.matrixRoomId
        },
        session: {
          roomId: room.id,
          userId: matrixClient.getCurrentUserId(),
          username,
          joinedAt: new Date().toISOString(),
          expiresAt: room.expiresAt
        }
      }
    })
  } catch (error) {
    console.error('Room join error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error.message === 'Invalid PIN code') {
      return NextResponse.json(
        { success: false, error: 'Invalid PIN code' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to join room' },
      { status: 500 }
    )
  }
}

// src/app/api/rooms/[roomId]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { matrixClient } from '@/lib/matrix/client'

const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  type: z.enum(['text', 'image']).default('text')
})

// GET - Fetch messages
export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params
    
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      )
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before') // For pagination
    
    // For now, return empty array as Matrix SDK integration would be complex
    // In a full implementation, you'd fetch from Matrix room timeline
    return NextResponse.json({
      success: true,
      data: {
        messages: [],
        hasMore: false,
        nextToken: null
      }
    })
  } catch (error) {
    console.error('Fetch messages error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST - Send message
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params
    const body = await request.json()
    const { content, type } = sendMessageSchema.parse(body)
    
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      )
    }
    
    // Send message via Matrix
    const message = await matrixClient.sendMessage(roomId, content)
    
    return NextResponse.json({
      success: true,
      data: {
        message: {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          senderName: message.senderName,
          timestamp: message.timestamp,
          type: message.type,
          encrypted: message.encrypted
        }
      }
    })
  } catch (error) {
    console.error('Send message error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid message', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

// src/app/api/uploads/image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      )
    }
    
    const formData = await request.formData()
    const file = formData.get('image') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large (max 5MB)' },
        { status: 400 }
      )
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type' },
        { status: 400 }
      )
    }
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }
    
    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `${timestamp}-${Math.random().toString(36).substr(2, 9)}.${extension}`
    const filepath = join(uploadsDir, filename)
    
    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)
    
    const url = `/uploads/${filename}`
    
    return NextResponse.json({
      success: true,
      data: {
        url,
        filename,
        size: file.size,
        type: file.type
      }
    })
  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    )
  }
}

// src/app/api/health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check system health
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        matrix: matrixClient.isConnected() ? 'connected' : 'disconnected',
        database: 'healthy', // If you have a database
        websocket: 'healthy'
      },
      version: process.env.npm_package_version || '1.0.0'
    }
    
    return NextResponse.json(health)
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      },
      { status: 500 }
    )
  }
}

// src/lib/api/client.ts
export class ApiClient {
  private baseUrl: string
  private accessToken: string | null = null
  
  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || (
      typeof window !== 'undefined' 
        ? window.location.origin 
        : 'http://localhost:3000'
    )
  }
  
  setAccessToken(token: string) {
    this.accessToken = token
  }
  
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }
    
    return headers
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`
    
    const response = await fetch(url, {
      headers: this.getHeaders(),
      ...options
    })
    
    const data = await response.json()
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    
    return data.data
  }
  
  // Auth methods
  async register(username: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username })
    })
  }
  
  // Room methods
  async createRoom(data: {
    pinCode: string
    username: string
    expirationMinutes?: number
    encrypted?: boolean
  }) {
    return this.request('/rooms/create', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
  
  async joinRoom(data: {
    roomId: string
    pinCode: string
    username: string
  }) {
    return this.request('/rooms/join', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
  
  // Message methods
  async sendMessage(roomId: string, content: string) {
    return this.request(`/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content })
    })
  }
  
  async getMessages(roomId: string, limit = 50, before?: string) {
    const params = new URLSearchParams({ limit: limit.toString() })
    if (before) params.set('before', before)
    
    return this.request(`/rooms/${roomId}/messages?${params.toString()}`)
  }
  
  // Upload methods
  async uploadImage(file: File) {
    const formData = new FormData()
    formData.append('image', file)
    
    const url = `${this.baseUrl}/api/uploads/image`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(this.accessToken && { 'Authorization': `Bearer ${this.accessToken}` })
      },
      body: formData
    })
    
    const data = await response.json()
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Upload failed')
    }
    
    return data.data
  }
  
  // Health check
  async getHealth() {
    const url = `${this.baseUrl}/api/health`
    const response = await fetch(url)
    return response.json()
  }
}

// Global API client instance
export const apiClient = new ApiClient()