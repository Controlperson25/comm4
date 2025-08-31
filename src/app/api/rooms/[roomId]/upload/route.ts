// app/api/rooms/[roomId]/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// In-memory storage (shared with other routes in production via database)
const rooms = new Map<string, {
  id: string
  name: string
  pinCode: string
  creatorId: string
  creatorUsername: string
  participants: Array<{
    id: string
    username: string
    joinedAt: string
    isOnline: boolean
  }>
  messages: Array<{
    id: string
    content: string
    senderId: string
    senderName: string
    timestamp: string
    type: 'text' | 'image'
    encrypted: boolean
    imageUrl?: string
  }>
  createdAt: string
  expiresAt: string
  matrixRoomId?: string
  encrypted: boolean
  isActive: boolean
  maxParticipants: number
}>()

// Upload rate limiting
const uploadLimits = new Map<string, { count: number; resetTime: number }>()

// Configuration
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880') // 5MB default
const ALLOWED_TYPES = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(',')
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads'

// Helper function to verify JWT
function verifyToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid authorization header')
  }

  const token = authHeader.substring(7)
  const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-key'
  
  try {
    return jwt.verify(token, jwtSecret) as any
  } catch (error) {
    throw new Error('Invalid token')
  }
}

// Rate limiting check for uploads
function checkUploadLimit(userId: string): boolean {
  const now = Date.now()
  const limit = uploadLimits.get(userId)
  
  if (!limit || now > limit.resetTime) {
    // Reset limit every 5 minutes
    uploadLimits.set(userId, { count: 1, resetTime: now + 300000 })
    return true
  }
  
  if (limit.count >= 10) { // 10 uploads per 5 minutes
    return false
  }
  
  limit.count++
  return true
}

// File validation
function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `Файл слишком большой (максимум ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)` 
    }
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Неподдерживаемый тип файла. Разрешены: JPG, PNG, GIF, WebP' 
    }
  }
  
  return { valid: true }
}

// Generate safe filename
function generateSafeFilename(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  const extension = originalName.split('.').pop()?.toLowerCase() || ''
  const safeName = originalName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.+/g, '.')
    .toLowerCase()
  
  return `${timestamp}_${random}_${safeName}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Требуется авторизация'
        },
        { status: 401 }
      )
    }

    // Verify token
    const decoded = verifyToken(authHeader)
    const userId = decoded.userId
    const username = decoded.username

    // Check upload rate limit
    if (!checkUploadLimit(userId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Upload limit exceeded',
          message: 'Слишком много загрузок. Подождите немного'
        },
        { status: 429 }
      )
    }

    // Get room
    const room = rooms.get(roomId)
    if (!room) {
      return NextResponse.json(
        {
          success: false,
          error: 'Room not found',
          message: 'Комната не найдена'
        },
        { status: 404 }
      )
    }

    // Check if room is active and not expired
    const now = new Date()
    const expiresAt = new Date(room.expiresAt)
    if (now > expiresAt || !room.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'Room inactive',
          message: 'Комната неактивна или срок действия истек'
        },
        { status: 410 }
      )
    }

    // Check if user is participant
    const participant = room.participants.find(p => p.id === userId && p.isOnline)
    if (!participant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not a participant',
          message: 'Вы не являетесь участником этой комнаты'
        },
        { status: 403 }
      )
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('image') as File
    const caption = formData.get('caption') as string || ''

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
          message: 'Файл не предоставлен'
        },
        { status: 400 }
      )
    }

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'File validation failed',
          message: validation.error
        },
        { status: 400 }
      )
    }

    // Create upload directory if it doesn't exist
    const roomUploadDir = join(process.cwd(), UPLOAD_DIR, roomId)
    if (!existsSync(roomUploadDir)) {
      await mkdir(roomUploadDir, { recursive: true })
    }

    // Generate filename and save file
    const filename = generateSafeFilename(file.name)
    const filepath = join(roomUploadDir, filename)
    
    // Convert file to buffer and write
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Generate public URL
    const publicUrl = `/uploads/${roomId}/${filename}`

    // Create message with image
    const message = {
      id: uuidv4(),
      content: caption || 'Изображение',
      senderId: userId,
      senderName: username,
      timestamp: now.toISOString(),
      type: 'image' as const,
      encrypted: room.encrypted,
      imageUrl: publicUrl
    }

    // Initialize messages array if it doesn't exist
    if (!room.messages) {
      room.messages = []
    }

    // Add message to room
    room.messages.push(message)

    // Keep only last 1000 messages
    if (room.messages.length > 1000) {
      room.messages = room.messages.slice(-1000)
    }

    // TODO: Broadcast message to other participants via WebSocket
    console.log(`Image uploaded to room ${roomId} by ${username}`)

    return NextResponse.json(
      {
        success: true,
        data: {
          url: publicUrl,
          filename,
          size: file.size,
          type: file.type,
          message
        },
        message: 'Изображение успешно загружено'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
        message: 'Произошла ошибка при загрузке файла'
      },
      { status: 500 }
    )
  }
}

// GET method to retrieve uploaded files info (for debugging)
export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      )
    }

    // Verify token
    const decoded = verifyToken(authHeader)
    const userId = decoded.userId

    // Get room
    const room = rooms.get(roomId)
    if (!room) {
      return NextResponse.json(
        {
          success: false,
          error: 'Room not found'
        },
        { status: 404 }
      )
    }

    // Check if user is participant
    const participant = room.participants.find(p => p.id === userId && p.isOnline)
    if (!participant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not a participant'
        },
        { status: 403 }
      )
    }

    // Get image messages
    const imageMessages = (room.messages || []).filter(m => m.type === 'image')

    return NextResponse.json({
      success: true,
      data: {
        images: imageMessages.map(m => ({
          id: m.id,
          url: m.imageUrl,
          caption: m.content,
          uploadedBy: m.senderName,
          uploadedAt: m.timestamp
        }))
      }
    })

  } catch (error) {
    console.error('Get uploads error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}