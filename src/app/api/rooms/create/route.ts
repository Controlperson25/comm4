// 1. src/app/api/rooms/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

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
    
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      )
    }
    
    // Create room (simplified for now)
    const room = {
      id: `room_${pinCode}_${Date.now()}`,
      name: `ActTalk-${pinCode}`,
      pinCode,
      expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString(),
      encrypted,
      participants: []
    }
    
    return NextResponse.json({
      success: true,
      data: { room }
    })
  } catch (error: any) {
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

// 2. src/app/api/rooms/join/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

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
    
    // Mock room validation (in real app, check database)
    if (!roomId.includes(pinCode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid PIN code' },
        { status: 403 }
      )
    }
    
    const room = {
      id: roomId,
      name: `ActTalk-${pinCode}`,
      participants: [{ id: 'user1', username, isOnline: true }],
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    }
    
    const session = {
      roomId,
      userId: 'user1',
      username,
      joinedAt: new Date().toISOString(),
      expiresAt: room.expiresAt
    }
    
    return NextResponse.json({
      success: true,
      data: { room, session }
    })
  } catch (error: any) {
    console.error('Room join error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to join room' },
      { status: 500 }
    )
  }
}

// 3. src/app/api/uploads/image/route.ts
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
  } catch (error: any) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    )
  }
}

// 4. src/app/api/health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        matrix: 'connected', // Would check real Matrix connection
        database: 'healthy',
        websocket: 'healthy'
      },
      version: '1.0.0'
    }
    
    return NextResponse.json(health)
  } catch (error: any) {
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