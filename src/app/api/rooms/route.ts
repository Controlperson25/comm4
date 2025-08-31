// app/api/rooms/route.ts
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

// POST - Создать новую комнату
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pinCode, username, roomName, duration = 60 } = body
    
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
    
    // Проверить, существует ли комната с таким PIN
    const existingRoom = memoryStore.getRoomByPin(pinCode)
    if (existingRoom) {
      return NextResponse.json(
        { success: false, error: 'Комната с таким PIN уже существует' },
        { status: 409 }
      )
    }
    
    // Создать комнату
    const result = memoryStore.createRoom({
      pinCode,
      username,
      roomName,
      duration
    })
    
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Ошибка создания комнаты' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: {
        room: {
          id: result.room.id,
          name: result.room.name,
          pinCode: result.room.pinCode,
          createdAt: result.room.createdAt,
          expiresAt: result.room.expiresAt,
          participantCount: result.room.participants.length,
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
        }
      }
    })
  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// GET - Получить список активных комнат (для отладки и статистики)
export async function GET() {
  try {
    const activeRooms = memoryStore.getAllActiveRooms()
    const stats = memoryStore.getStats()
    
    const roomList = activeRooms.map(room => ({
      id: room.id,
      name: room.name,
      pinCode: room.pinCode, // В продакшене не отдавать PIN
      participantCount: room.participants.length,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
      isActive: room.isActive,
      lastActivity: room.lastActivity,
      creatorUsername: room.creatorUsername
    }))
    
    return NextResponse.json({
      success: true,
      data: {
        rooms: roomList,
        stats
      }
    })
  } catch (error) {
    console.error('Error getting rooms:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка получения списка комнат' },
      { status: 500 }
    )
  }
}