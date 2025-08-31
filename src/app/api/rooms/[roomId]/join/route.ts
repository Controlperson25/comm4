// app/api/rooms/[roomId]/join/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Получаем ссылку на то же хранилище (в реальном приложении - база данных)
const rooms = new Map<string, any>()

// POST - Присоединиться к комнате
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const roomId = params.roomId
    const body = await request.json()
    const { pinCode, username } = body
    
    // Валидация
    if (!pinCode || !username) {
      return NextResponse.json(
        { success: false, error: 'PIN-код и имя пользователя обязательны' },
        { status: 400 }
      )
    }
    
    // Найти комнату по ID или PIN
    let room = rooms.get(roomId)
    
    // Если комната не найдена по ID, попробуем найти по PIN
    if (!room) {
      room = Array.from(rooms.values()).find(r => 
        r.pinCode === pinCode && r.isActive
      )
    }
    
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Комната не найдена' },
        { status: 404 }
      )
    }
    
    // Проверить PIN-код
    if (room.pinCode !== pinCode) {
      return NextResponse.json(
        { success: false, error: 'Неверный PIN-код' },
        { status: 401 }
      )
    }
    
    // Проверить, что комната активна
    if (!room.isActive) {
      return NextResponse.json(
        { success: false, error: 'Комната неактивна' },
        { status: 410 }
      )
    }
    
    // Проверить, что комната не истекла
    const now = new Date()
    const expiresAt = new Date(room.expiresAt)
    if (now >= expiresAt) {
      room.isActive = false
      rooms.set(room.id, room)
      return NextResponse.json(
        { success: false, error: 'Срок действия комнаты истек' },
        { status: 410 }
      )
    }
    
    // Проверить, что пользователь еще не в комнате
    const existingParticipant = room.participants.find((p: any) => p.username === username)
    
    let participant
    if (existingParticipant) {
      // Обновить статус существующего участника
      existingParticipant.isOnline = true
      participant = existingParticipant
    } else {
      // Добавить нового участника
      participant = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username,
        joinedAt: now.toISOString(),
        isOnline: true,
        role: 'participant' as const
      }
      room.participants.push(participant)
    }
    
    // Обновить комнату
    rooms.set(room.id, room)
    
    return NextResponse.json({
      success: true,
      data: {
        room: {
          id: room.id,
          name: room.name,
          participantCount: room.participants.length,
          expiresAt: room.expiresAt,
          isActive: room.isActive
        },
        session: {
          roomId: room.id,
          userId: participant.id,
          username,
          role: participant.role,
          joinedAt: participant.joinedAt,
          expiresAt: room.expiresAt
        },
        participants: room.participants.map((p: any) => ({
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
      { success: false, error: 'Ошибка присоединения к комнате' },
      { status: 500 }
    )
  }
}