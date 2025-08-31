// src/lib/matrix/client.ts
import { 
  createClient, 
  MatrixClient, 
  MatrixEvent,
  Room,
  RoomEvent,
  ClientEvent,
  EventType,
  MsgType,
  MatrixError
} from 'matrix-js-sdk'

import type { 
  Message, 
  Room as ChatRoom, 
  Participant, 
  ChatSession,
  ConnectionStatus 
} from '@/types/chat'

export interface MatrixConfig {
  homeserverUrl: string
  serverName: string
  userId?: string
  accessToken?: string
  deviceId?: string
}

export class MatrixClientWrapper {
  private client: MatrixClient | null = null
  private config: MatrixConfig | null = null
  private isStarted = false
  private eventHandlers: Map<string, Function[]> = new Map()
  
  constructor() {
    this.setupEventListeners()
  }

  async initialize(config: MatrixConfig): Promise<void> {
    try {
      this.config = config
      
      this.client = createClient({
        baseUrl: config.homeserverUrl,
        userId: config.userId,
        accessToken: config.accessToken,
        deviceId: config.deviceId,
        timelineSupport: true,
        unstableClientRelationAggregation: true
      })

      // Setup event listeners
      this.setupMatrixEventListeners()
      
      // Start the client
      await this.client.startClient({
        initialSyncLimit: 20,
        lazyLoadMembers: true
      })
      
      this.isStarted = true
      this.emit('client:ready')
      
    } catch (error) {
      console.error('Failed to initialize Matrix client:', error)
      this.emit('client:error', error)
      throw error
    }
  }

  private setupEventListeners(): void {
    this.eventHandlers = new Map([
      ['client:ready', []],
      ['client:error', []],
      ['room:created', []],
      ['room:joined', []],
      ['room:left', []],
      ['message:received', []],
      ['message:sent', []],
      ['member:joined', []],
      ['member:left', []],
      ['typing:start', []],
      ['typing:stop', []],
      ['connection:status', []]
    ])
  }

  private setupMatrixEventListeners(): void {
    if (!this.client) return

    // Client events
    this.client.on(ClientEvent.Sync, (state, prevState) => {
      console.log('Matrix sync state:', state)
      
      if (state === 'PREPARED') {
        this.emit('connection:status', 'connected')
      } else if (state === 'ERROR') {
        this.emit('connection:status', 'error')
      } else if (state === 'SYNCING') {
        this.emit('connection:status', 'connecting')
      }
    })

    // Room timeline events (messages)
    this.client.on(RoomEvent.Timeline, (event: MatrixEvent, room: Room) => {
      if (event.getType() === EventType.RoomMessage) {
        const message = this.parseMatrixMessage(event, room)
        if (message) {
          this.emit('message:received', message)
        }
      }
    })

    // Room membership events
    this.client.on(RoomEvent.MyMembership, (room: Room, membership: string) => {
      if (membership === 'join') {
        this.emit('room:joined', this.parseMatrixRoom(room))
      } else if (membership === 'leave') {
        this.emit('room:left', room.roomId)
      }
    })

    // Typing events
    this.client.on(RoomEvent.Typing, (event: MatrixEvent, room: Room) => {
      const typingUsers = room.getTypingMembers()
      if (typingUsers.length > 0) {
        this.emit('typing:start', {
          roomId: room.roomId,
          users: typingUsers.map(user => ({
            userId: user.userId,
            username: user.name || user.userId
          }))
        })
      } else {
        this.emit('typing:stop', { roomId: room.roomId })
      }
    })

    // Error handling
    this.client.on(ClientEvent.ClientWellKnown, (wellKnown) => {
      console.log('Matrix well-known config:', wellKnown)
    })
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(callback)
  }

  off(event: string, callback: Function): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(callback)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event) || []
    handlers.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error)
      }
    })
  }

  // Room management
  async createRoom(options: {
    name?: string
    topic?: string
    pinCode: string
    encrypted?: boolean
    expirationMinutes?: number
  }): Promise<ChatRoom> {
    if (!this.client) throw new Error('Matrix client not initialized')

    try {
      const roomOptions = {
        name: options.name || `Room-${options.pinCode}`,
        topic: options.topic || 'Private Act Talk room',
        preset: 'private_chat' as const,
        visibility: 'private' as const,
        initial_state: [] as any[],
        power_level_content_override: {
          invite: 100,
          kick: 100,
          ban: 100,
          redact: 100,
          state_default: 100,
          events_default: 0,
          users_default: 0
        }
      }

      // Enable encryption if requested
      if (options.encrypted !== false) {
        roomOptions.initial_state.push({
          type: EventType.RoomEncryption,
          content: {
            algorithm: 'm.megolm.v1.aes-sha2'
          }
        })
      }

      // Add custom state for pin code and expiration
      roomOptions.initial_state.push({
        type: 'com.acttalk.room.config',
        content: {
          pinCode: options.pinCode,
          expiresAt: new Date(Date.now() + (options.expirationMinutes || 60) * 60 * 1000).toISOString(),
          createdBy: this.client.getUserId()
        }
      })

      const result = await this.client.createRoom(roomOptions)
      const matrixRoom = this.client.getRoom(result.room_id)
      
      if (!matrixRoom) {
        throw new Error('Failed to get created room')
      }

      const chatRoom = this.parseMatrixRoom(matrixRoom)
      this.emit('room:created', chatRoom)
      
      return chatRoom
    } catch (error) {
      console.error('Failed to create room:', error)
      throw error
    }
  }

  async joinRoom(roomId: string, pinCode?: string): Promise<ChatRoom> {
    if (!this.client) throw new Error('Matrix client not initialized')

    try {
      // Validate pin code if provided
      if (pinCode) {
        const room = this.client.getRoom(roomId)
        if (room) {
          const configEvent = room.currentState.getStateEvents('com.acttalk.room.config', '')
          if (configEvent && configEvent.getContent().pinCode !== pinCode) {
            throw new Error('Invalid PIN code')
          }
        }
      }

      await this.client.joinRoom(roomId)
      const matrixRoom = this.client.getRoom(roomId)
      
      if (!matrixRoom) {
        throw new Error('Failed to get joined room')
      }

      const chatRoom = this.parseMatrixRoom(matrixRoom)
      this.emit('room:joined', chatRoom)
      
      return chatRoom
    } catch (error) {
      console.error('Failed to join room:', error)
      throw error
    }
  }

  async leaveRoom(roomId: string): Promise<void> {
    if (!this.client) throw new Error('Matrix client not initialized')

    try {
      await this.client.leave(roomId)
      this.emit('room:left', roomId)
    } catch (error) {
      console.error('Failed to leave room:', error)
      throw error
    }
  }

  // Message handling
  async sendMessage(roomId: string, content: string): Promise<Message> {
    if (!this.client) throw new Error('Matrix client not initialized')

    try {
      const eventId = await this.client.sendTextMessage(roomId, content)
      
      const message: Message = {
        id: eventId.event_id,
        content,
        senderId: this.client.getUserId() || '',
        senderName: this.getUserDisplayName(this.client.getUserId() || ''),
        timestamp: new Date(),
        type: 'text',
        encrypted: this.isRoomEncrypted(roomId),
        matrixEventId: eventId.event_id
      }

      this.emit('message:sent', message)
      return message
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    }
  }

  async sendTyping(roomId: string, typing: boolean, timeout?: number): Promise<void> {
    if (!this.client) return

    try {
      await this.client.sendTyping(roomId, typing, timeout || 3000)
    } catch (error) {
      console.error('Failed to send typing indicator:', error)
    }
  }

  // Utility methods
  private parseMatrixMessage(event: MatrixEvent, room: Room): Message | null {
    const content = event.getContent()
    
    if (content.msgtype !== MsgType.Text) {
      return null // For now, only handle text messages
    }

    return {
      id: event.getId() || '',
      content: content.body || '',
      senderId: event.getSender() || '',
      senderName: this.getUserDisplayName(event.getSender() || ''),
      timestamp: new Date(event.getTs()),
      type: 'text',
      encrypted: event.isEncrypted(),
      matrixEventId: event.getId()
    }
  }

  private parseMatrixRoom(room: Room): ChatRoom {
    const configEvent = room.currentState.getStateEvents('com.acttalk.room.config', '')
    const config = configEvent?.getContent() || {}
    
    return {
      id: room.roomId,
      name: room.name || `Room-${config.pinCode || 'Unknown'}`,
      pinCode: config.pinCode || '',
      participants: this.getRoomParticipants(room),
      createdAt: new Date(room.getMyMembership() === 'join' ? Date.now() : 0),
      expiresAt: config.expiresAt ? new Date(config.expiresAt) : new Date(Date.now() + 60 * 60 * 1000),
      matrixRoomId: room.roomId,
      isActive: true
    }
  }

  private getRoomParticipants(room: Room): Participant[] {
    return room.getJoinedMembers().map(member => ({
      id: member.userId,
      username: member.name || member.userId,
      joinedAt: new Date(), // Matrix doesn't easily provide join time
      isOnline: true, // Simplified for now
      matrixUserId: member.userId
    }))
  }

  private getUserDisplayName(userId: string): string {
    if (!this.client) return userId
    
    const user = this.client.getUser(userId)
    return user?.displayName || userId
  }

  private isRoomEncrypted(roomId: string): boolean {
    if (!this.client) return false
    
    const room = this.client.getRoom(roomId)
    return room?.hasEncryptionStateEvent() || false
  }

  // Authentication
  async loginWithPassword(username: string, password: string): Promise<{
    userId: string
    accessToken: string
    deviceId: string
  }> {
    if (!this.config) throw new Error('Matrix config not set')

    const tempClient = createClient({
      baseUrl: this.config.homeserverUrl
    })

    try {
      const response = await tempClient.login('m.login.password', {
        user: username,
        password: password
      })

      return {
        userId: response.user_id,
        accessToken: response.access_token,
        deviceId: response.device_id
      }
    } catch (error) {
      console.error('Matrix login failed:', error)
      throw error
    }
  }

  async registerGuest(): Promise<{
    userId: string
    accessToken: string
    deviceId: string
  }> {
    if (!this.config) throw new Error('Matrix config not set')

    const tempClient = createClient({
      baseUrl: this.config.homeserverUrl
    })

    try {
      const response = await tempClient.registerGuest()
      
      return {
        userId: response.user_id,
        accessToken: response.access_token,
        deviceId: response.device_id
      }
    } catch (error) {
      console.error('Matrix guest registration failed:', error)
      throw error
    }
  }

  // Connection management
  async disconnect(): Promise<void> {
    if (this.client && this.isStarted) {
      this.client.stopClient()
      this.isStarted = false
      this.emit('connection:status', 'disconnected')
    }
  }

  isConnected(): boolean {
    return this.client?.getSyncState() === 'SYNCING' || this.client?.getSyncState() === 'PREPARED'
  }

  getClient(): MatrixClient | null {
    return this.client
  }

  getCurrentUserId(): string | null {
    return this.client?.getUserId() || null
  }
}

// Global Matrix client instance
export const matrixClient = new MatrixClientWrapper()