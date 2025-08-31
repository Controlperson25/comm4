// src/lib/websocket/client.ts
import type { ConnectionStatus, Message, TypingUser } from '@/types/chat'
import { useChatStore } from '@/store/chatStore'
import { useUserStore } from '@/store/userStore'

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'user_joined' | 'user_left' | 'room_status' | 'error' | 'ping' | 'pong'
  roomId?: string
  userId?: string
  username?: string
  data?: any
  timestamp?: string
  id?: string
}

export interface WebSocketConfig {
  url: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private config: WebSocketConfig
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private eventHandlers: Map<string, Function[]> = new Map()
  private isManualDisconnect = false
  
  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 1000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      ...config
    }
    
    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.eventHandlers = new Map([
      ['connected', []],
      ['disconnected', []],
      ['message', []],
      ['typing', []],
      ['user_joined', []],
      ['user_left', []],
      ['error', []],
      ['room_status', []]
    ])
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
        console.error(`Error in WebSocket event handler for ${event}:`, error)
      }
    })
  }

  // Connection management
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isManualDisconnect = false
        
        // Update connection status
        useChatStore.getState().setConnectionStatus('connecting')
        useChatStore.getState().setConnecting(true)
        
        this.ws = new WebSocket(this.config.url)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          this.isManualDisconnect = false
          
          // Update stores
          useChatStore.getState().setConnectionStatus('connected')
          useChatStore.getState().setConnecting(false)
          useChatStore.getState().resetReconnectAttempts()
          useChatStore.getState().setError(null)
          
          this.startHeartbeat()
          this.emit('connected')
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          
          this.stopHeartbeat()
          useChatStore.getState().setConnectionStatus('disconnected')
          useChatStore.getState().setConnecting(false)
          
          this.emit('disconnected', { code: event.code, reason: event.reason })
          
          // Auto-reconnect unless it was manual
          if (!this.isManualDisconnect && event.code !== 1000) {
            this.handleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          
          const errorMessage = 'WebSocket connection error'
          useChatStore.getState().setConnectionStatus('error')
          useChatStore.getState().setError(errorMessage)
          
          this.emit('error', error)
          reject(error)
        }

        // Connection timeout
        setTimeout(() => {
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            this.ws.close()
            reject(new Error('WebSocket connection timeout'))
          }
        }, 10000) // 10 second timeout

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error)
        useChatStore.getState().setConnectionStatus('error')
        useChatStore.getState().setError('Failed to connect')
        reject(error)
      }
    })
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      console.warn('Max reconnection attempts reached')
      useChatStore.getState().setConnectionStatus('error')
      useChatStore.getState().setError('Connection failed after multiple attempts')
      return
    }

    this.reconnectAttempts++
    useChatStore.getState().incrementReconnectAttempts()
    
    const delay = this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1)
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isManualDisconnect) {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error)
        })
      }
    }, delay)
  }

  disconnect(): void {
    this.isManualDisconnect = true
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect')
      this.ws = null
    }
    
    this.stopHeartbeat()
    useChatStore.getState().setConnectionStatus('disconnected')
  }

  // Heartbeat mechanism
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'ping',
          timestamp: new Date().toISOString()
        })
      }
    }, this.config.heartbeatInterval!)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // Message handling
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data)
      
      switch (message.type) {
        case 'message':
          this.handleChatMessage(message)
          break
          
        case 'typing':
          this.handleTypingIndicator(message)
          break
          
        case 'user_joined':
          this.handleUserJoined(message)
          break
          
        case 'user_left':
          this.handleUserLeft(message)
          break
          
        case 'room_status':
          this.handleRoomStatus(message)
          break
          
        case 'error':
          this.handleError(message)
          break
          
        case 'pong':
          // Heartbeat response - connection is alive
          break
          
        default:
          console.warn('Unknown WebSocket message type:', message.type)
      }
      
      this.emit(message.type, message)
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error, data)
    }
  }

  private handleChatMessage(wsMessage: WebSocketMessage): void {
    if (!wsMessage.data) return
    
    const message: Message = {
      id: wsMessage.data.id || wsMessage.id || Date.now().toString(),
      content: wsMessage.data.content,
      senderId: wsMessage.userId || wsMessage.data.senderId,
      senderName: wsMessage.username || wsMessage.data.senderName,
      timestamp: wsMessage.timestamp ? new Date(wsMessage.timestamp) : new Date(),
      type: wsMessage.data.type || 'text',
      encrypted: wsMessage.data.encrypted || false,
      imageUrl: wsMessage.data.imageUrl
    }
    
    // Add to chat store
    useChatStore.getState().addMessage(message)
  }

  private handleTypingIndicator(wsMessage: WebSocketMessage): void {
    if (!wsMessage.userId || !wsMessage.username || !wsMessage.roomId) return
    
    const typingUser: TypingUser = {
      userId: wsMessage.userId,
      username: wsMessage.username,
      lastTyping: new Date()
    }
    
    const chatStore = useChatStore.getState()
    
    if (wsMessage.data?.typing) {
      chatStore.setUserTyping(typingUser)
    } else {
      chatStore.removeUserTyping(wsMessage.userId)
    }
  }

  private handleUserJoined(wsMessage: WebSocketMessage): void {
    if (!wsMessage.userId || !wsMessage.username) return
    
    const participant = {
      id: wsMessage.userId,
      username: wsMessage.username,
      joinedAt: new Date(),
      isOnline: true
    }
    
    useChatStore.getState().addParticipant(participant)
  }

  private handleUserLeft(wsMessage: WebSocketMessage): void {
    if (!wsMessage.userId) return
    
    useChatStore.getState().removeParticipant(wsMessage.userId)
  }

  private handleRoomStatus(wsMessage: WebSocketMessage): void {
    // Handle room status updates
    console.log('Room status update:', wsMessage.data)
  }

  private handleError(wsMessage: WebSocketMessage): void {
    const errorMessage = wsMessage.data?.message || 'WebSocket error'
    console.error('WebSocket error message:', errorMessage)
    
    useChatStore.getState().setError(errorMessage)
  }

  // Send methods
  send(message: WebSocketMessage): void {
    if (!this.isConnected()) {
      throw new Error('WebSocket is not connected')
    }

    try {
      this.ws!.send(JSON.stringify(message))
    } catch (error) {
      console.error('Failed to send WebSocket message:', error)
      throw error
    }
  }

  sendMessage(roomId: string, content: string): void {
    const userStore = useUserStore.getState()
    const currentUser = userStore.currentUser
    
    if (!currentUser) {
      throw new Error('No current user')
    }

    this.send({
      type: 'message',
      roomId,
      userId: currentUser.id,
      username: currentUser.username,
      data: {
        content,
        type: 'text',
        encrypted: false
      },
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    })
  }

  sendTyping(roomId: string, typing: boolean): void {
    const userStore = useUserStore.getState()
    const currentUser = userStore.currentUser
    
    if (!currentUser) return

    this.send({
      type: 'typing',
      roomId,
      userId: currentUser.id,
      username: currentUser.username,
      data: { typing },
      timestamp: new Date().toISOString()
    })
  }

  joinRoom(roomId: string): void {
    const userStore = useUserStore.getState()
    const currentUser = userStore.currentUser
    
    if (!currentUser) {
      throw new Error('No current user')
    }

    this.send({
      type: 'user_joined',
      roomId,
      userId: currentUser.id,
      username: currentUser.username,
      timestamp: new Date().toISOString()
    })
  }

  leaveRoom(roomId: string): void {
    const userStore = useUserStore.getState()
    const currentUser = userStore.currentUser
    
    if (!currentUser) return

    this.send({
      type: 'user_left',
      roomId,
      userId: currentUser.id,
      username: currentUser.username,
      timestamp: new Date().toISOString()
    })
  }

  // Status methods
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  getConnectionState(): ConnectionStatus {
    if (!this.ws) return 'disconnected'
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting'
      case WebSocket.OPEN:
        return 'connected'
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected'
      default:
        return 'error'
    }
  }
}

// WebSocket hook for React components
export function useWebSocket(url?: string) {
  const [client, setClient] = useState<WebSocketClient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  
  useEffect(() => {
    if (!url) return

    const wsClient = new WebSocketClient({ url })
    
    // Event handlers
    wsClient.on('connected', () => {
      setIsConnected(true)
      setConnectionStatus('connected')
    })
    
    wsClient.on('disconnected', () => {
      setIsConnected(false)
      setConnectionStatus('disconnected')
    })
    
    wsClient.on('error', () => {
      setIsConnected(false)
      setConnectionStatus('error')
    })
    
    setClient(wsClient)
    
    // Auto-connect
    wsClient.connect().catch(error => {
      console.error('Failed to connect WebSocket:', error)
    })
    
    return () => {
      wsClient.disconnect()
    }
  }, [url])
  
  return {
    client,
    isConnected,
    connectionStatus,
    connect: () => client?.connect(),
    disconnect: () => client?.disconnect(),
    sendMessage: (roomId: string, content: string) => client?.sendMessage(roomId, content),
    sendTyping: (roomId: string, typing: boolean) => client?.sendTyping(roomId, typing),
    joinRoom: (roomId: string) => client?.joinRoom(roomId),
    leaveRoom: (roomId: string) => client?.leaveRoom(roomId)
  }
}

export default WebSocketClient