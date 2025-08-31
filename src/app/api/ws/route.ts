// app/api/ws/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { WebSocketServer, WebSocket } from 'ws'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

// WebSocket connections storage
const connections = new Map<string, {
  ws: WebSocket
  userId: string
  username: string
  roomId: string
  joinedAt: Date
}>()

const roomConnections = new Map<string, Set<string>>() // roomId -> Set of connection IDs
const userTyping = new Map<string, { userId: string; username: string; roomId: string; timeout: NodeJS.Timeout }>()

// In-memory rooms storage (should be shared with other routes)
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

// Helper function to verify JWT from query params
function verifyTokenFromQuery(url: string) {
  const urlObj = new URL(url, 'http://localhost')
  const token = urlObj.searchParams.get('token')
  
  if (!token) {
    throw new Error('No token provided')
  }

  const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-key'
  
  try {
    return jwt.verify(token, jwtSecret) as any
  } catch (error) {
    throw new Error('Invalid token')
  }
}

// Broadcast message to room participants
function broadcastToRoom(roomId: string, message: any, excludeConnectionId?: string) {
  const roomConnIds = roomConnections.get(roomId)
  if (!roomConnIds) return

  const messageStr = JSON.stringify(message)
  
  roomConnIds.forEach(connId => {
    if (connId === excludeConnectionId) return
    
    const connection = connections.get(connId)
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(messageStr)
    }
  })
}

// Handle WebSocket message
function handleMessage(connectionId: string, data: string) {
  try {
    const connection = connections.get(connectionId)
    if (!connection) return

    const message = JSON.parse(data)
    const { type, payload } = message

    switch (type) {
      case 'message':
        handleChatMessage(connection, payload)
        break
        
      case 'typing':
        handleTyping(connection, payload)
        break
        
      case 'ping':
        // Respond with pong to keep connection alive
        connection.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
        break
        
      default:
        console.warn('Unknown message type:', type)
    }
  } catch (error) {
    console.error('Error handling WebSocket message:', error)
  }
}

// Handle chat message
function handleChatMessage(connection: any, payload: any) {
  const { content, type = 'text' } = payload
  const { userId, username, roomId } = connection

  // Validate message
  if (!content || content.trim().length === 0) {
    return
  }

  if (content.length > 1000) {
    connection.ws.send(JSON.stringify({
      type: 'error',
      message: 'Сообщение слишком длинное'
    }))
    return
  }

  // Get room
  const room = rooms.get(roomId)
  if (!room) {
    connection.ws.send(JSON.stringify({
      type: 'error',
      message: 'Комната не найдена'
    }))
    return
  }

  // Check if room is active
  const now = new Date()
  const expiresAt = new Date(room.expiresAt)
  if (now > expiresAt || !room.isActive) {
    connection.ws.send(JSON.stringify({
      type: 'error',
      message: 'Комната неактивна'
    }))
    return
  }

  // Create message
  const messageObj = {
    id: uuidv4(),
    content: content.trim(),
    senderId: userId,
    senderName: username,
    timestamp: now.toISOString(),
    type,
    encrypted: room.encrypted
  }

  // Add to room messages
  if (!room.messages) {
    room.messages = []
  }
  room.messages.push(messageObj)

  // Keep only last 1000 messages
  if (room.messages.length > 1000) {
    room.messages = room.messages.slice(-1000)
  }

  // Broadcast to all room participants
  broadcastToRoom(roomId, {
    type: 'message',
    payload: messageObj,
    timestamp: now.toISOString()
  })

  console.log(`Message sent in room ${roomId} by ${username}`)
}

// Handle typing indicator
function handleTyping(connection: any, payload: any) {
  const { isTyping } = payload
  const { userId, username, roomId } = connection

  const typingKey = `${roomId}:${userId}`

  if (isTyping) {
    // Clear existing timeout
    const existing = userTyping.get(typingKey)
    if (existing) {
      clearTimeout(existing.timeout)
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      userTyping.delete(typingKey)
      broadcastToRoom(roomId, {
        type: 'typing',
        payload: {
          userId,
          username,
          isTyping: false
        }
      })
    }, 3000) // Stop typing after 3 seconds

    userTyping.set(typingKey, { userId, username, roomId, timeout })

    // Broadcast typing start
    broadcastToRoom(roomId, {
      type: 'typing',
      payload: {
        userId,
        username,
        isTyping: true
      }
    }, connection.id)
  } else {
    // Stop typing
    const existing = userTyping.get(typingKey)
    if (existing) {
      clearTimeout(existing.timeout)
      userTyping.delete(typingKey)
    }

    broadcastToRoom(roomId, {
      type: 'typing',
      payload: {
        userId,
        username,
        isTyping: false
      }
    })
  }
}

// Handle connection close
function handleClose(connectionId: string) {
  const connection = connections.get(connectionId)
  if (!connection) return

  const { userId, username, roomId } = connection

  // Remove from connections
  connections.delete(connectionId)

  // Remove from room connections
  const roomConnIds = roomConnections.get(roomId)
  if (roomConnIds) {
    roomConnIds.delete(connectionId)
    if (roomConnIds.size === 0) {
      roomConnections.delete(roomId)
    }
  }

  // Clear typing if exists
  const typingKey = `${roomId}:${userId}`
  const existing = userTyping.get(typingKey)
  if (existing) {
    clearTimeout(existing.timeout)
    userTyping.delete(typingKey)
  }

  // Update participant status in room
  const room = rooms.get(roomId)
  if (room) {
    const participant = room.participants.find(p => p.id === userId)
    if (participant) {
      // Check if user has other active connections
      const hasOtherConnections = Array.from(connections.values())
        .some(conn => conn.userId === userId && conn.roomId === roomId)
      
      if (!hasOtherConnections) {
        participant.isOnline = false
        
        // Broadcast user left
        broadcastToRoom(roomId, {
          type: 'user_left',
          payload: {
            userId,
            username,
            room: {
              id: roomId,
              participants: room.participants.filter(p => p.isOnline)
            }
          }
        })
      }
    }
  }

  console.log(`WebSocket connection closed for user ${username} in room ${roomId}`)
}

// WebSocket upgrade handler
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      )
    }

    // Verify token
    let decoded
    try {
      decoded = verifyTokenFromQuery(request.url)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or missing token' },
        { status: 401 }
      )
    }

    const { userId, username } = decoded

    // Check if room exists
    const room = rooms.get(roomId)
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Check if user is participant
    const participant = room.participants.find(p => p.id === userId)
    if (!participant) {
      return NextResponse.json(
        { error: 'Not a room participant' },
        { status: 403 }
      )
    }

    // For now, return info about WebSocket endpoint
    // In a real implementation, you'd upgrade the connection here
    return NextResponse.json({
      message: 'WebSocket endpoint ready',
      roomId,
      userId,
      username,
      wsUrl: `ws://localhost:3001/ws?roomId=${roomId}&token=${searchParams.get('token')}`
    })

  } catch (error) {
    console.error('WebSocket error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Export for external WebSocket server setup
export {
  connections,
  roomConnections,
  handleMessage,
  handleClose,
  broadcastToRoom
}