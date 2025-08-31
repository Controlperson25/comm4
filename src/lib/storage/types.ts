// src/lib/storage/types.ts

export interface Room {
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

export interface Participant {
  id: string
  username: string
  joinedAt: string
  lastSeen: string
  isOnline: boolean
  role: 'creator' | 'participant'
}

export interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  timestamp: string
  type: 'text' | 'image' | 'system'
  roomId: string
}

export interface Session {
  id: string
  userId: string
  username: string
  roomId: string
  role: 'creator' | 'participant'
  createdAt: string
  expiresAt: string
  isActive: boolean
}

export interface CreateRoomData {
  pinCode: string
  username: string
  roomName?: string
  duration?: number
}

export interface JoinRoomData {
  roomId?: string
  pinCode: string
  username: string
}

export interface CreateMessageData {
  roomId: string
  content: string
  senderId: string
  senderName: string
  type?: 'text' | 'image' | 'system'
}

export interface GetMessagesOptions {
  page?: number
  limit?: number
}

export interface GetMessagesResult {
  messages: Message[]
  total: number
  hasMore: boolean
}

export interface RoomJoinResult {
  room: Room
  participant: Participant
  session: Session
}

export interface StorageStats {
  rooms: number
  activeRooms: number
  messages: number
  sessions: number
  activeSessions: number
  timestamp: string
}