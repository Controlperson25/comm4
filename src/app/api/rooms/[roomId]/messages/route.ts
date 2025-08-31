// app/api/rooms/[roomId]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { memoryStore } from '@/lib/storage'

// GET - Получить сообщения комнаты
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    // ✅ Правильно для Next.js 15
    const { roomId } = await params
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Проверить существование комнаты
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
    
    // Получить сообщения
    const result = memoryStore.getRoomMessages(roomId, { page, limit })
    
    return NextResponse.json({
      success: true,
      data: result.messages.map(message => ({
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        senderName: message.senderName,
        timestamp: message.timestamp,
        type: message.type
      })),
      pagination: {
        page,
        limit,
        total: result.total,
        hasMore: result.hasMore
      }
    })
  } catch (error) {
    console.error('Error getting messages:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка получения сообщений' },
      { status: 500 }
    )
  }
}

// POST - Отправить сообщение
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const body = await request.json()
    const { content, senderId, senderName, type = 'text' } = body
    
    // Валидация
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Содержимое сообщения не может быть пустым' },
        { status: 400 }
      )
    }
    
    if (!senderId || !senderName) {
      return NextResponse.json(
        { success: false, error: 'ID отправителя и имя обязательны' },
        { status: 400 }
      )
    }
    
    if (content.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Сообщение слишком длинное (максимум 1000 символов)' },
        { status: 400 }
      )
    }
    
    if (!['text', 'image', 'system'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Недопустимый тип сообщения' },
        { status: 400 }
      )
    }
    
    // Проверить существование и активность комнаты
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
    
    // Проверить, что пользователь в комнате
    const participant = room.participants.find(p => p.id === senderId)
    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден в комнате' },
        { status: 403 }
      )
    }
    
    // Проверить rate limiting (максимум 10 сообщений в минуту)
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
    const recentMessages = memoryStore.getRoomMessages(roomId, { page: 1, limit: 100 })
      .messages.filter(msg => 
        msg.senderId === senderId && 
        new Date(msg.timestamp) > oneMinuteAgo
      )
    
    if (recentMessages.length >= 10) {
      return NextResponse.json(
        { success: false, error: 'Слишком много сообщений. Подождите немного.' },
        { status: 429 }
      )
    }
    
    // Создать сообщение
    const message = memoryStore.addMessage({
      roomId,
      content: content.trim(),
      senderId,
      senderName,
      type
    })
    
    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Ошибка создания сообщения' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: {
        message: {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          senderName: message.senderName,
          timestamp: message.timestamp,
          type: message.type
        }
      }
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка отправки сообщения' },
      { status: 500 }
    )
  }
}