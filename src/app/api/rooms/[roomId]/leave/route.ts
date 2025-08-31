// app/api/rooms/[roomId]/leave/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

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

    // Find participant
    const participantIndex = room.participants.findIndex(p => p.id === userId)
    if (participantIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not a participant',
          message: 'Вы не являетесь участником этой комнаты'
        },
        { status: 403 }
      )
    }

    const participant = room.participants[participantIndex]
    const now = new Date()

    // Mark participant as offline instead of removing
    participant.isOnline = false

    // Add system message
    const leaveMessage = {
      id: uuidv4(),
      content: `${username} покинул чат`,
      senderId: 'system',
      senderName: 'Система',
      timestamp: now.toISOString(),
      type: 'text' as const,
      encrypted: false
    }

    // Initialize messages array if it doesn't exist
    if (!room.messages) {
      room.messages = []
    }
    room.messages.push(leaveMessage)

    // Check if room should be closed (no online participants)
    const onlineParticipants = room.participants.filter(p => p.isOnline)
    
    if (onlineParticipants.length === 0) {
      // Mark room as inactive
      room.isActive = false
      
      // Schedule room deletion after 5 minutes of inactivity
      setTimeout(() => {
        const currentRoom = rooms.get(roomId)
        if (currentRoom && !currentRoom.isActive) {
          const stillHasOnlineUsers = currentRoom.participants.some(p => p.isOnline)
          if (!stillHasOnlineUsers) {
            rooms.delete(roomId)
            console.log(`Room ${roomId} deleted due to inactivity`)
          }
        }
      }, 5 * 60 * 1000) // 5 minutes
    }

    // Special handling if creator leaves
    if (room.creatorId === userId && onlineParticipants.length > 0) {
      // Transfer ownership to the next oldest participant
      const newCreator = onlineParticipants.sort((a, b) => 
        new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
      )[0]
      
      room.creatorId = newCreator.id
      room.creatorUsername = newCreator.username
      
      // Add system message about ownership transfer
      const transferMessage = {
        id: uuidv4(),
        content: `${newCreator.username} теперь администратор комнаты`,
        senderId: 'system',
        senderName: 'Система',
        timestamp: now.toISOString(),
        type: 'text' as const,
        encrypted: false
      }
      room.messages.push(transferMessage)
    }

    // TODO: Notify other participants via WebSocket
    console.log(`User ${username} left room ${roomId}`)

    return NextResponse.json({
      success: true,
      data: {
        leftAt: now.toISOString(),
        remainingParticipants: onlineParticipants.length,
        roomActive: room.isActive
      },
      message: 'Вы покинули комнату'
    })

  } catch (error) {
    console.error('Leave room error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Произошла ошибка при выходе из комнаты'
      },
      { status: 500 }
    )
  }
}

// GET method to check if user is still in room
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
    const participant = room.participants.find(p => p.id === userId)
    const isParticipant = participant && participant.isOnline

    return NextResponse.json({
      success: true,
      data: {
        isParticipant,
        roomActive: room.isActive,
        ...(participant && {
          joinedAt: participant.joinedAt,
          isOnline: participant.isOnline
        })
      }
    })

  } catch (error) {
    console.error('Check participation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}