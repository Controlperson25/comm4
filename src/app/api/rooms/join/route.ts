// app/api/rooms/join/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { memoryStore } from '@/lib/storage'

// Функция для валидации PIN
function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

// Функция для валидации имени пользователя
function isValidUsername(username: string): boolean {
  return username.length >= 2 && username.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(username)
}

// POST - Присоединиться к комнате по PIN-коду
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pinCode, username } = body
    
    // Валидация
    if (!pinCode || !username) {
      return NextResponse.json(
        { success: false, error: 'PIN-код и имя пользователя обязательны' },
        { status: 400 }
      )
    }
    
    if (!isValidPin(pinCode)) {
      return NextResponse.json(
        { success: false, error: 'PIN-код должен содержать 4 цифры' },
        { status: 400 }
      )
    }
    
    if (!isValidUsername(username)) {
      return NextResponse.json(
        { success: false, error: 'Имя пользователя должно быть от 2 до 20 символов и содержать только буквы, цифры, дефисы и подчеркивания' },
        { status: 400 }
      )
    }
    
    // Попробовать присоединиться к комнате
    const result = memoryStore.joinRoom({
      pinCode,
      username
    })
    
    if (!result) {
      // Попробуем понять, почему не удалось присоединиться
      const room = memoryStore.getRoomByPin(pinCode)
      
      if (!room) {
        return NextResponse.json(
          { success: false, error: 'Комната с таким PIN не найдена' },
          { status: 404 }
        )
      }
      
      if (!room.isActive) {
        return NextResponse.json(
          { success: false, error: 'Комната неактивна' },
          { status: 410 }
        )
      }
      
      const now = new Date()
      const expiresAt = new Date(room.expiresAt)
      if (now >= expiresAt) {
        return NextResponse.json(
          { success: false, error: 'Срок действия комнаты истек' },
          { status: 410 }
        )
      }
      
      if (room.participants.length >= (room.maxParticipants || 10)) {
        return NextResponse.json(
          { success: false, error: 'Комната заполнена' },
          { status: 429 }
        )
      }
      
      return NextResponse.json(
        { success: false, error: 'Не удалось присоединиться к комнате' },
        { status: 400 }
      )
    }
    
    // Добавить системное сообщение о присоединении
    const isRejoining = result.room.participants.some(p => 
      p.username === username && p.id !== result.participant.id
    )
    
    if (!isRejoining) {
      memoryStore.addMessage({
        roomId: result.room.id,
        content: `${username} присоединился к комнате`,
        senderId: 'system',
        senderName: 'Система',
        type: 'system'
      })
    }
    
    return NextResponse.json({
      success: true,
      data: {
        room: {
          id: result.room.id,
          name: result.room.name,
          pinCode: result.room.pinCode,
          participantCount: result.room.participants.length,
          expiresAt: result.room.expiresAt,
          isActive: result.room.isActive,
          maxParticipants: result.room.maxParticipants
        },
        session: {
          sessionId: result.session.id,
          roomId: result.session.roomId,
          userId: result.session.userId,
          username: result.session.username,
          role: result.session.role,
          joinedAt: result.session.createdAt,
          expiresAt: result.session.expiresAt
        },
        participant: {
          id: result.participant.id,
          username: result.participant.username,
          role: result.participant.role,
          joinedAt: result.participant.joinedAt,
          isOnline: result.participant.isOnline
        },
        participants: result.room.participants.map(p => ({
          id: p.id,
          username: p.username,
          isOnline: p.isOnline,
          joinedAt: p.joinedAt,
          role: p.role
        }))
      }
    })
  } catch (error) {
    console.error('Error joining room:', error)
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}