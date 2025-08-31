// src/lib/storage/memory-store.ts
interface Room {
  id: string
  name: string
  pinCode: string
  participants: Participant[]
  createdAt: string
  expiresAt: string
  isActive: boolean
  creatorUsername: string
  maxParticipants?: number
  lastActivity?: string
}

interface Participant {
  id: string
  username: string
  joinedAt: string
  lastSeen: string
  isOnline: boolean
  role: 'creator' | 'participant'
}

interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  timestamp: string
  type: 'text' | 'image' | 'system'
  roomId: string
}

interface Session {
  id: string
  userId: string
  username: string
  roomId: string
  role: 'creator' | 'participant'
  createdAt: string
  expiresAt: string
  isActive: boolean
}

/**
 * Единое хранилище данных для всего приложения
 * В продакшене будет заменено на базу данных
 */
export class MemoryStore {
  private static instance: MemoryStore
  
  private rooms = new Map<string, Room>()
  private messages = new Map<string, Message[]>() // roomId -> messages
  private sessions = new Map<string, Session>() // sessionId -> session
  private userSessions = new Map<string, string[]>() // username -> sessionIds
  
  private constructor() {
    // Singleton pattern
    this.startCleanup()
  }
  
  public static getInstance(): MemoryStore {
    if (!MemoryStore.instance) {
      MemoryStore.instance = new MemoryStore()
    }
    return MemoryStore.instance
  }
  
  // ==================== ROOMS ====================
  
  /**
   * Создать новую комнату
   */
  createRoom(data: {
    pinCode: string
    username: string
    roomName?: string
    duration?: number
  }): { room: Room; participant: Participant; session: Session } {
    const roomId = this.generateRoomId()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (data.duration || 60) * 60 * 1000)
    
    const participant: Participant = {
      id: this.generateUserId(),
      username: data.username,
      joinedAt: now.toISOString(),
      lastSeen: now.toISOString(),
      isOnline: true,
      role: 'creator'
    }
    
    const room: Room = {
      id: roomId,
      name: data.roomName || `Комната ${data.pinCode}`,
      pinCode: data.pinCode,
      participants: [participant],
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isActive: true,
      creatorUsername: data.username,
      maxParticipants: 10,
      lastActivity: now.toISOString()
    }
    
    const session: Session = {
      id: this.generateSessionId(),
      userId: participant.id,
      username: data.username,
      roomId,
      role: 'creator',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isActive: true
    }
    
    this.rooms.set(roomId, room)
    this.messages.set(roomId, [])
    this.sessions.set(session.id, session)
    this.addUserSession(data.username, session.id)
    
    return { room, participant, session }
  }
  
  /**
   * Найти комнату по ID
   */
  getRoomById(roomId: string): Room | null {
    return this.rooms.get(roomId) || null
  }
  
  /**
   * Найти комнату по PIN-коду
   */
  getRoomByPin(pinCode: string): Room | null {
    for (const room of this.rooms.values()) {
      if (room.pinCode === pinCode && room.isActive) {
        return room
      }
    }
    return null
  }
  
  /**
   * Обновить комнату
   */
  updateRoom(roomId: string, updates: Partial<Room>): Room | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    
    const updatedRoom = { ...room, ...updates }
    this.rooms.set(roomId, updatedRoom)
    return updatedRoom
  }
  
  /**
   * Присоединиться к комнате
   */
  joinRoom(data: {
    roomId?: string
    pinCode: string
    username: string
  }): { room: Room; participant: Participant; session: Session } | null {
    // Найти комнату по ID или PIN
    let room = data.roomId ? this.getRoomById(data.roomId) : null
    if (!room) {
      room = this.getRoomByPin(data.pinCode)
    }
    
    if (!room || !room.isActive) {
      return null
    }
    
    // Проверить, что комната не истекла
    if (new Date() >= new Date(room.expiresAt)) {
      room.isActive = false
      this.rooms.set(room.id, room)
      return null
    }
    
    // Проверить лимит участников
    if (room.participants.length >= (room.maxParticipants || 10)) {
      return null
    }
    
    const now = new Date()
    
    // Проверить, есть ли уже такой участник
    let participant = room.participants.find(p => p.username === data.username)
    
    if (participant) {
      // Обновить существующего участника
      participant.isOnline = true
      participant.lastSeen = now.toISOString()
    } else {
      // Создать нового участника
      participant = {
        id: this.generateUserId(),
        username: data.username,
        joinedAt: now.toISOString(),
        lastSeen: now.toISOString(),
        isOnline: true,
        role: 'participant'
      }
      room.participants.push(participant)
    }
    
    // Создать сессию
    const session: Session = {
      id: this.generateSessionId(),
      userId: participant.id,
      username: data.username,
      roomId: room.id,
      role: participant.role,
      createdAt: now.toISOString(),
      expiresAt: room.expiresAt,
      isActive: true
    }
    
    // Обновить комнату
    room.lastActivity = now.toISOString()
    this.rooms.set(room.id, room)
    this.sessions.set(session.id, session)
    this.addUserSession(data.username, session.id)
    
    return { room, participant, session }
  }
  
  /**
   * Покинуть комнату
   */
  leaveRoom(roomId: string, username: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    
    // Удалить участника
    room.participants = room.participants.filter(p => p.username !== username)
    
    // Если комната пустая, деактивировать
    if (room.participants.length === 0) {
      room.isActive = false
    }
    
    this.rooms.set(roomId, room)
    
    // Деактивировать сессии пользователя в этой комнате
    for (const session of this.sessions.values()) {
      if (session.roomId === roomId && session.username === username) {
        session.isActive = false
        this.sessions.set(session.id, session)
      }
    }
    
    return true
  }
  
  // ==================== MESSAGES ====================
  
  /**
   * Добавить сообщение
   */
  addMessage(data: {
    roomId: string
    content: string
    senderId: string
    senderName: string
    type?: 'text' | 'image' | 'system'
  }): Message | null {
    const room = this.rooms.get(data.roomId)
    if (!room || !room.isActive) return null
    
    const message: Message = {
      id: this.generateMessageId(),
      content: data.content,
      senderId: data.senderId,
      senderName: data.senderName,
      timestamp: new Date().toISOString(),
      type: data.type || 'text',
      roomId: data.roomId
    }
    
    const roomMessages = this.messages.get(data.roomId) || []
    roomMessages.push(message)
    this.messages.set(data.roomId, roomMessages)
    
    // Обновить активность комнаты
    room.lastActivity = message.timestamp
    this.rooms.set(data.roomId, room)
    
    return message
  }
  
  /**
   * Получить сообщения комнаты
   */
  getRoomMessages(roomId: string, options?: {
    page?: number
    limit?: number
  }): { messages: Message[]; total: number; hasMore: boolean } {
    const roomMessages = this.messages.get(roomId) || []
    const page = options?.page || 1
    const limit = options?.limit || 50
    
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    
    const sortedMessages = roomMessages
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    
    const paginatedMessages = sortedMessages.slice(startIndex, endIndex)
    
    return {
      messages: paginatedMessages,
      total: roomMessages.length,
      hasMore: endIndex < roomMessages.length
    }
  }
  
  // ==================== SESSIONS ====================
  
  /**
   * Получить сессию
   */
  getSession(sessionId: string): Session | null {
    return this.sessions.get(sessionId) || null
  }
  
  /**
   * Деактивировать сессию
   */
  deactivateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false
    
    session.isActive = false
    this.sessions.set(sessionId, session)
    return true
  }
  
  // ==================== UTILITY METHODS ====================
  
  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private addUserSession(username: string, sessionId: string): void {
    const userSessions = this.userSessions.get(username) || []
    userSessions.push(sessionId)
    this.userSessions.set(username, userSessions)
  }
  
  /**
   * Очистка истекших данных
   */
  private startCleanup(): void {
    setInterval(() => {
      const now = new Date()
      
      // Очистка истекших комнат
      for (const [roomId, room] of this.rooms.entries()) {
        if (now >= new Date(room.expiresAt)) {
          room.isActive = false
          this.rooms.set(roomId, room)
        }
      }
      
      // Очистка истекших сессий
      for (const [sessionId, session] of this.sessions.entries()) {
        if (now >= new Date(session.expiresAt)) {
          session.isActive = false
          this.sessions.set(sessionId, session)
        }
      }
      
      // Удаление старых неактивных данных (старше 24 часов)
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      
      for (const [roomId, room] of this.rooms.entries()) {
        if (!room.isActive && new Date(room.expiresAt) < dayAgo) {
          this.rooms.delete(roomId)
          this.messages.delete(roomId)
        }
      }
      
    }, 5 * 60 * 1000) // Каждые 5 минут
  }
  
  // ==================== DEBUG METHODS ====================
  
  /**
   * Получить статистику хранилища
   */
  getStats() {
    return {
      rooms: this.rooms.size,
      activeRooms: Array.from(this.rooms.values()).filter(r => r.isActive).length,
      messages: Array.from(this.messages.values()).reduce((sum, msgs) => sum + msgs.length, 0),
      sessions: this.sessions.size,
      activeSessions: Array.from(this.sessions.values()).filter(s => s.isActive).length,
      timestamp: new Date().toISOString()
    }
  }
  
  /**
   * Получить все активные комнаты (для отладки)
   */
  getAllActiveRooms(): Room[] {
    return Array.from(this.rooms.values()).filter(room => room.isActive)
  }
}