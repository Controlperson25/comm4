// app/api/rooms/[roomId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { memoryStore } from '@/lib/storage'

// GET - Получить информацию о комнате
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    // ✅ Правильно для Next.js 15
    const { roomId } = await params
    
    const room = memoryStore.getRoomById(roomId)
    
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Комната не найдена' },
        { status: 404 }
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
      // Деактивировать истекшую комнату
      memoryStore.updateRoom(roomId, { isActive: false })
      return NextResponse.json(
        { success: false, error: 'Срок действия комнаты истек' },
        { status: 410 }
      )
    }
    
    // Получить сообщения комнаты
    const messagesResult = memoryStore.getRoomMessages(roomId, { 
      page: 1, 
      limit: 50 
    })
    
    return NextResponse.json({
      success: true,
      data: {
        room: {
          id: room.id,
          name: room.name,
          pinCode: room.pinCode,
          participantCount: room.participants.length,
          expiresAt: room.expiresAt,
          isActive: room.isActive,
          maxParticipants: room.maxParticipants,
          lastActivity: room.lastActivity
        },
        participants: room.participants.map(p => ({
          id: p.id,
          username: p.username,
          isOnline: p.isOnline,
          joinedAt: p.joinedAt,
          role: p.role
        })),
        messages: messagesResult.messages,
        messagesPagination: {
          total: messagesResult.total,
          hasMore: messagesResult.hasMore
        }
      }
    })
  } catch (error) {
    console.error('Error getting room:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка получения информации о комнате' },
      { status: 500 }
    )
  }
}

// POST - Выполнить действие в комнате
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const body = await request.json()
    const { action, ...data } = body
    
    const room = memoryStore.getRoomById(roomId)
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Комната не найдена' },
        { status: 404 }
      )
    }
    
    if (!room.isActive) {
      return NextResponse.json(
        { success: false, error: 'Комната неактивна' },
        { status: 410 }
      )
    }
    
    switch (action) {
      case 'join':
        const joinResult = memoryStore.joinRoom({
          roomId,
          pinCode: data.pinCode || room.pinCode,
          username: data.username
        })
        
        if (!joinResult) {
          return NextResponse.json(
            { success: false, error: 'Не удалось присоединиться к комнате' },
            { status: 400 }
          )
        }
        
        return NextResponse.json({
          success: true,
          data: {
            room: {
              id: joinResult.room.id,
              name: joinResult.room.name,
              participantCount: joinResult.room.participants.length,
              expiresAt: joinResult.room.expiresAt,
              isActive: joinResult.room.isActive
            },
            session: {
              sessionId: joinResult.session.id,
              roomId: joinResult.session.roomId,
              userId: joinResult.session.userId,
              username: joinResult.session.username,
              role: joinResult.session.role,
              joinedAt: joinResult.session.createdAt,
              expiresAt: joinResult.session.expiresAt
            },
            participant: joinResult.participant,
            participants: joinResult.room.participants.map(p => ({
              id: p.id,
              username: p.username,
              isOnline: p.isOnline,
              joinedAt: p.joinedAt,
              role: p.role
            }))
          }
        })
        
      case 'leave':
        const success = memoryStore.leaveRoom(roomId, data.username)
        
        if (!success) {
          return NextResponse.json(
            { success: false, error: 'Не удалось покинуть комнату' },
            { status: 400 }
          )
        }
        
        const updatedRoom = memoryStore.getRoomById(roomId)
        
        return NextResponse.json({
          success: true,
          data: {
            room: updatedRoom ? {
              id: updatedRoom.id,
              name: updatedRoom.name,
              participantCount: updatedRoom.participants.length,
              isActive: updatedRoom.isActive
            } : null
          }
        })
        
      default:
        return NextResponse.json(
          { success: false, error: 'Неизвестное действие' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error processing room action:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка выполнения действия' },
      { status: 500 }
    )
  }
}

// PUT - Обновить комнату (только для создателя)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const updates = await request.json()
    
    const room = memoryStore.getRoomById(roomId)
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Комната не найдена' },
        { status: 404 }
      )
    }
    
    // Обновить комнату
    const updatedRoom = memoryStore.updateRoom(roomId, updates)
    
    if (!updatedRoom) {
      return NextResponse.json(
        { success: false, error: 'Ошибка обновления комнаты' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: {
        room: {
          id: updatedRoom.id,
          name: updatedRoom.name,
          participantCount: updatedRoom.participants.length,
          expiresAt: updatedRoom.expiresAt,
          isActive: updatedRoom.isActive,
          lastActivity: updatedRoom.lastActivity
        }
      }
    })
  } catch (error) {
    console.error('Error updating room:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка обновления комнаты' },
      { status: 500 }
    )
  }
}

// DELETE - Удалить комнату (только для создателя)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    
    const room = memoryStore.getRoomById(roomId)
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Комната не найдена' },
        { status: 404 }
      )
    }
    
    // Деактивировать комнату вместо полного удаления
    const deactivatedRoom = memoryStore.updateRoom(roomId, { 
      isActive: false,
      lastActivity: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: true,
      message: 'Комната деактивирована',
      data: {
        room: deactivatedRoom
      }
    })
  } catch (error) {
    console.error('Error deleting room:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка удаления комнаты' },
      { status: 500 }
    )
  }
}