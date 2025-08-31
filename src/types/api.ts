// types/api.ts
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  code?: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

// Запросы для аутентификации
export interface RegisterUserRequest {
  username: string
  sessionId?: string
}

export interface RegisterUserResponse {
  user: {
    id: string
    username: string
    sessionId: string
    createdAt: string
  }
  token?: string
}

// Запросы для комнат
export interface CreateRoomRequest {
  pinCode: string
  username: string
  roomName?: string
  maxParticipants?: number
  duration?: number // в минутах
}

export interface CreateRoomResponse {
  room: {
    id: string
    name: string
    pinCode: string
    createdAt: string
    expiresAt: string
    maxParticipants: number
    isActive: boolean
  }
  session: {
    sessionId: string
    userId: string
    role: 'creator'
  }
}

export interface JoinRoomRequest {
  roomId: string
  pinCode: string
  username: string
}

export interface JoinRoomResponse {
  room: {
    id: string
    name: string
    participantCount: number
    expiresAt: string
    isActive: boolean
  }
  session: {
    sessionId: string
    userId: string
    role: 'participant'
  }
  participants: Array<{
    id: string
    username: string
    isOnline: boolean
    joinedAt: string
  }>
}

export interface LeaveRoomRequest {
  roomId: string
  sessionId: string
}

// Запросы для сообщений
export interface SendMessageRequest {
  roomId: string
  content: string
  type: 'text' | 'image'
  replyTo?: string
  sessionId: string
}

export interface SendMessageResponse {
  message: {
    id: string
    content: string
    senderId: string
    senderName: string
    timestamp: string
    type: string
    status: 'sent'
  }
}

export interface GetMessagesRequest {
  roomId: string
  sessionId: string
  page?: number
  limit?: number
  before?: string // timestamp
}

export interface GetMessagesResponse extends PaginatedResponse<{
  id: string
  content: string
  senderId: string
  senderName: string
  timestamp: string
  type: string
}> {}

// Запросы для загрузки файлов
export interface UploadFileRequest {
  roomId: string
  file: File
  description?: string
  sessionId: string
}

export interface UploadFileResponse {
  file: {
    id: string
    filename: string
    url: string
    size: number
    type: string
    uploadedAt: string
  }
  message: {
    id: string
    content: string
    senderId: string
    senderName: string
    timestamp: string
    type: 'image'
    imageUrl: string
  }
}

// Статус и здоровье системы
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down'
  timestamp: string
  services: {
    websocket: 'ok' | 'error'
    matrix: 'ok' | 'error'
    database: 'ok' | 'error'
  }
  stats: {
    activeRooms: number
    activeUsers: number
    messagesPerMinute: number
    uptime: number
  }
}

// WebSocket события (типизированные)
export interface WSEventMessage {
  type: 'message'
  payload: {
    message: {
      id: string
      content: string
      senderId: string
      senderName: string
      timestamp: string
      type: string
    }
    roomId: string
  }
}

export interface WSEventJoin {
  type: 'join'
  payload: {
    user: {
      id: string
      username: string
    }
    roomId: string
    timestamp: string
  }
}

export interface WSEventLeave {
  type: 'leave'
  payload: {
    userId: string
    username: string
    roomId: string
    timestamp: string
  }
}

export interface WSEventTyping {
  type: 'typing'
  payload: {
    userId: string
    username: string
    isTyping: boolean
    roomId: string
    timestamp: string
  }
}

export interface WSEventError {
  type: 'error'
  payload: {
    error: string
    code?: string
    details?: any
  }
}

export interface WSEventRoomStatus {
  type: 'room_status'
  payload: {
    roomId: string
    status: 'active' | 'expired' | 'closed'
    participantCount: number
    expiresAt?: string
  }
}

export type WebSocketEvent = 
  | WSEventMessage 
  | WSEventJoin 
  | WSEventLeave 
  | WSEventTyping 
  | WSEventError 
  | WSEventRoomStatus

// Ошибки
export interface ApiError {
  message: string
  code: string
  statusCode: number
  details?: any
  timestamp: string
}

export interface ValidationError extends ApiError {
  code: 'VALIDATION_ERROR'
  details: {
    field: string
    message: string
    value?: any
  }[]
}

export interface NotFoundError extends ApiError {
  code: 'NOT_FOUND'
  details: {
    resource: string
    id?: string
  }
}

export interface RateLimitError extends ApiError {
  code: 'RATE_LIMIT_EXCEEDED'
  details: {
    limit: number
    resetTime: string
    remaining: number
  }
}