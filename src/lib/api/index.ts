// src/lib/api/index.ts
import { apiClient } from './client'
import { roomsAPI } from './rooms'
import { messagesAPI } from './messages'
import { useChatStore, useChatActions, useChatSelectors } from '@/store/chatStore'
import { useUserStore, useUserActions, useUserSelectors } from '@/store/userStore'
import { useUIActions, useNotifications } from '@/store/uiStore'
import type { CreateRoomRequest, JoinRoomRequest, SendMessageRequest } from '@/types/api'

/**
 * Высокоуровневый API клиент с интеграцией в Zustand stores
 */
export class IntegratedAPI {
  private roomsAPI = roomsAPI
  private messagesAPI = messagesAPI
  
  // ==================== ROOM OPERATIONS ====================
  
  /**
   * Создать комнату с обновлением состояния
   */
  async createRoom(data: CreateRoomRequest): Promise<void> {
    const userActions = useUserActions()
    const chatActions = useChatActions()
    const uiActions = useUIActions()
    const notifications = useNotifications()
    
    try {
      uiActions.setLoading('createRoom', true)
      chatActions.setLoading(true)
      
      const result = await this.roomsAPI.createRoom(data)
      
      // Обновить stores
      if (result.room) {
        const room = {
          id: result.room.id,
          name: result.room.name,
          pinCode: result.room.pinCode,
          participants: [{
            id: result.participant?.id || '',
            username: data.username,
            joinedAt: result.room.createdAt,
            lastSeen: new Date().toISOString(),
            isOnline: true,
            role: 'creator' as const
          }],
          createdAt: result.room.createdAt,
          expiresAt: result.room.expiresAt,
          isActive: result.room.isActive || true,
          creatorUsername: data.username,
          maxParticipants: result.room.maxParticipants || 10
        }
        
        chatActions.setRoom(room)
        
        if (result.session) {
          chatActions.setCurrentSession({
            id: result.session.sessionId,
            userId: result.session.userId,
            username: result.session.username,
            roomId: result.session.roomId,
            role: result.session.role,
            createdAt: result.session.joinedAt,
            expiresAt: result.session.expiresAt,
            isActive: true
          })
        }
      }
      
      notifications.addSuccess('Комната создана', `PIN: ${data.pinCode}`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка создания комнаты'
      chatActions.setError(errorMessage)
      notifications.addError('Ошибка', errorMessage)
      throw error
    } finally {
      uiActions.setLoading('createRoom', false)
      chatActions.setLoading(false)
    }
  }
  
  /**
   * Присоединиться к комнате с обновлением состояния
   */
  async joinRoom(data: JoinRoomRequest): Promise<void> {
    const chatActions = useChatActions()
    const uiActions = useUIActions()
    const notifications = useNotifications()
    
    try {
      uiActions.setLoading('joinRoom', true)
      chatActions.setLoading(true)
      
      const result = await this.roomsAPI.joinRoomByPin(data)
      
      // Обновить stores
      if (result.room) {
        const room = {
          id: result.room.id,
          name: result.room.name,
          pinCode: result.room.pinCode || data.pinCode,
          participants: result.participants?.map(p => ({
            id: p.id,
            username: p.username,
            joinedAt: p.joinedAt,
            lastSeen: new Date().toISOString(),
            isOnline: p.isOnline,
            role: p.role
          })) || [],
          createdAt: new Date().toISOString(),
          expiresAt: result.room.expiresAt,
          isActive: result.room.isActive,
          creatorUsername: '',
          maxParticipants: result.room.maxParticipants || 10
        }
        
        chatActions.setRoom(room)
        chatActions.setParticipants(room.participants)
        
        if (result.session) {
          chatActions.setCurrentSession({
            id: result.session.sessionId,
            userId: result.session.userId,
            username: result.session.username,
            roomId: result.session.roomId,
            role: result.session.role,
            createdAt: result.session.joinedAt,
            expiresAt: result.session.expiresAt,
            isActive: true
          })
        }
      }
      
      notifications.addSuccess('Присоединение', `Подключение к комнате ${result.room?.name}`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка присоединения'
      chatActions.setError(errorMessage)
      notifications.addError('Ошибка', errorMessage)
      throw error
    } finally {
      uiActions.setLoading('joinRoom', false)
      chatActions.setLoading(false)
    }
  }
  
  /**
   * Загрузить сообщения комнаты
   */
  async loadRoomMessages(roomId: string, sessionId: string): Promise<void> {
    const chatActions = useChatActions()
    const uiActions = useUIActions()
    
    try {
      uiActions.setLoading('loadMessages', true)
      
      const result = await this.messagesAPI.getMessages({
        roomId,
        sessionId,
        page: 1,
        limit: 50
      })
      
      if (result.data) {
        const messages = result.data.map(msg => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          senderName: msg.senderName,
          timestamp: msg.timestamp,
          type: msg.type as 'text' | 'image' | 'system',
          roomId
        }))
        
        chatActions.setMessages(messages)
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки сообщений'
      chatActions.setError(errorMessage)
    } finally {
      uiActions.setLoading('loadMessages', false)
    }
  }
  
  /**
   * Отправить сообщение с optimistic updates
   */
  async sendMessage(data: SendMessageRequest): Promise<void> {
    const chatActions = useChatActions()
    const chatSelectors = useChatSelectors
    const uiActions = useUIActions()
    const notifications = useNotifications()
    
    // Создать optimistic сообщение
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const tempMessage = {
      id: tempId,
      content: data.content,
      senderId: data.sessionId,
      senderName: 'Вы', // Временное имя
      timestamp: new Date().toISOString(),
      type: data.type || 'text' as const,
      roomId: data.roomId
    }
    
    // Добавить optimistic сообщение
    chatActions.addMessage(tempMessage)
    
    try {
      chatActions.setSending(true)
      
      const result = await this.messagesAPI.sendMessage(data)
      
      if (result.message) {
        // Заменить временное сообщение на серверное
        chatActions.markMessageAsSent(tempId, {
          id: result.message.id,
          content: result.message.content,
          senderId: result.message.senderId,
          senderName: result.message.senderName,
          timestamp: result.message.timestamp,
          type: result.message.type as 'text' | 'image' | 'system',
          roomId: data.roomId
        })
      }
      
    } catch (error) {
      // Удалить неудачное сообщение
      chatActions.updateMessage(tempId, { 
        content: '[Ошибка отправки]',
        type: 'system'
      })
      
      const errorMessage = error instanceof Error ? error.message : 'Ошибка отправки сообщения'
      notifications.addError('Ошибка отправки', errorMessage)
      throw error
    } finally {
      chatActions.setSending(false)
    }
  }
  
  /**
   * Отправить изображение
   */
  async sendImage(roomId: string, file: File, sessionId: string, description?: string): Promise<void> {
    const chatActions = useChatActions()
    const notifications = useNotifications()
    
    try {
      chatActions.setSending(true)
      
      const result = await this.messagesAPI.sendImage(roomId, file, sessionId, description)
      
      if (result.message) {
        chatActions.addMessage({
          id: result.message.id,
          content: result.message.content,
          senderId: result.message.senderId,
          senderName: result.message.senderName,
          timestamp: result.message.timestamp,
          type: 'image',
          roomId
        })
      }
      
      notifications.addSuccess('Изображение отправлено', file.name)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка отправки изображения'
      notifications.addError('Ошибка', errorMessage)
      throw error
    } finally {
      chatActions.setSending(false)
    }
  }
  
  /**
   * Покинуть комнату
   */
  async leaveRoom(roomId: string, username: string): Promise<void> {
    const chatActions = useChatActions()
    const userActions = useUserActions()
    const notifications = useNotifications()
    
    try {
      await this.roomsAPI.leaveRoom(roomId, username)
      
      // Очистить состояние чата
      chatActions.leaveRoom()
      userActions.resetSteps()
      
      notifications.addInfo('Выход', 'Вы покинули комнату')
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка выхода из комнаты'
      notifications.addError('Ошибка', errorMessage)
      throw error
    }
  }
  
  /**
   * Инициализировать чат-сессию
   */
  async initializeChat(roomId: string, sessionData?: {
    username: string
    pinCode?: string
    role?: 'creator' | 'participant'
  }): Promise<void> {
    const chatActions = useChatActions()
    const userActions = useUserActions()
    const notifications = useNotifications()
    
    try {
      chatActions.setLoading(true)
      chatActions.setConnecting(true)
      
      // Получить информацию о комнате
      const roomInfo = await this.roomsAPI.getRoomInfo(roomId)
      
      if (roomInfo.room) {
        chatActions.setRoom({
          id: roomInfo.room.id,
          name: roomInfo.room.name,
          pinCode: roomInfo.room.pinCode,
          participants: roomInfo.participants || [],
          createdAt: roomInfo.room.expiresAt, // Placeholder
          expiresAt: roomInfo.room.expiresAt,
          isActive: roomInfo.room.isActive,
          creatorUsername: roomInfo.room.creatorUsername || '',
          maxParticipants: roomInfo.room.maxParticipants
        })
        
        if (roomInfo.participants) {
          chatActions.setParticipants(roomInfo.participants)
        }
      }
      
      // Загрузить сообщения
      if (sessionData) {
        await this.loadRoomMessages(roomId, sessionData.username)
      }
      
      chatActions.setConnected(true)
      chatActions.setConnectionStatus('connected')
      userActions.setStep(4) // CHAT step
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка инициализации чата'
      chatActions.setError(errorMessage)
      chatActions.setConnectionStatus('error')
      notifications.addError('Ошибка подключения', errorMessage)
      throw error
    } finally {
      chatActions.setLoading(false)
      chatActions.setConnecting(false)
    }
  }
}

// Singleton экземпляр
export const integratedAPI = new IntegratedAPI()

// Экспорты для удобства
export { apiClient } from './client'
export { roomsAPI } from './rooms'
export { messagesAPI } from './messages'

// Типы
export type { ApiResponse, ApiError } from '@/types/api'