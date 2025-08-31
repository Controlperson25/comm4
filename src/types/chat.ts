// types/chat.ts
export interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  timestamp: Date
  type: 'text' | 'image' | 'system'
  encrypted?: boolean
  imageUrl?: string
  matrixEventId?: string
  status?: 'sending' | 'sent' | 'delivered' | 'failed'
  replyTo?: string
}

export interface Room {
  id: string
  name: string
  pinCode: string
  participants: Participant[]
  createdAt: Date
  expiresAt: Date
  matrixRoomId?: string
  isActive: boolean
  maxParticipants?: number
  isEncrypted?: boolean
  lastActivity?: Date
}

export interface Participant {
  id: string
  username: string
  joinedAt: Date
  isOnline: boolean
  matrixUserId?: string
  role?: 'creator' | 'participant'
  lastSeen?: Date
}

export interface ChatSession {
  roomId: string
  userId: string
  username: string
  joinedAt: Date
  isActive: boolean
  expiresAt: Date
  role: 'creator' | 'participant'
}

export interface TypingUser {
  userId: string
  username: string
  timestamp: Date
}

export interface ChatState {
  // Основные данные
  messages: Message[]
  currentRoom: Room | null
  participants: Participant[]
  currentSession: ChatSession | null
  
  // Состояние подключения
  isConnected: boolean
  isConnecting: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastError: string | null
  
  // UI состояние
  isTyping: Record<string, boolean>
  typingUsers: TypingUser[]
  isLoading: boolean
  
  // Метаданные
  lastMessageId: string | null
  hasMore: boolean
  unreadCount: number
}

// WebSocket события
export interface WebSocketMessage {
  type: 'message' | 'join' | 'leave' | 'typing' | 'error' | 'room_status' | 'user_online' | 'user_offline'
  payload: any
  timestamp?: string
  id?: string
  roomId?: string
  userId?: string
}

// События чата
export interface ChatEvent {
  type: string
  data: any
  timestamp: Date
  source: 'websocket' | 'matrix' | 'local'
}

// Статистика комнаты
export interface RoomStats {
  messageCount: number
  participantCount: number
  activeUsers: number
  uptime: number
  bytesTransferred: number
}

// Настройки чата
export interface ChatSettings {
  notifications: boolean
  sounds: boolean
  encryption: boolean
  autoDeleteAfter?: number
  messageRetention?: number
}

// Типы для API
export interface CreateRoomRequest {
  pinCode: string
  username: string
  roomName?: string
  maxParticipants?: number
  duration?: number
}

export interface JoinRoomRequest {
  roomId: string
  pinCode: string
  username: string
}

export interface SendMessageRequest {
  roomId: string
  content: string
  type: 'text' | 'image'
  replyTo?: string
}

export interface UploadFileRequest {
  roomId: string
  file: File
  description?: string
}

// Ответы от API
export interface RoomResponse {
  room: Room
  session: ChatSession
  participants: Participant[]
}

export interface MessageResponse {
  message: Message
  success: boolean
}

export interface ErrorResponse {
  error: string
  code?: string
  details?: any
}