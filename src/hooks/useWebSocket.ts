// src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback, useState } from 'react'
import { useChatStore } from '@/store/chatStore'
import { useUserStore } from '@/store/userStore'
import { useUIStore } from '@/store/uiStore'
import type { WSEvent, MessageEvent, UserJoinedEvent, UserLeftEvent, TypingEvent, RoomExpiredEvent } from '@/types/api'
import type { Message } from '@/types/chat'
import { ENV_URLS } from '@/constants/routes'

interface UseWebSocketOptions {
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  onMessage?: (message: Message) => void
  reconnectAttempts?: number
  reconnectInterval?: number
}

export function useWebSocket(roomId: string, options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [reconnectCount, setReconnectCount] = useState(0)
  const [isManualClose, setIsManualClose] = useState(false)

  // Store hooks
  const { 
    setConnectionStatus, 
    addMessage, 
    addParticipant, 
    removeParticipant,
    addTypingUser,
    removeTypingUser
  } = useChatStore()
  const { currentUser, updateUserActivity } = useUserStore()
  const { addToast } = useUIStore()

  // Options with defaults
  const {
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    reconnectAttempts = 5,
    reconnectInterval = 1000
  } = options

  // WebSocket URL
  const wsUrl = `${ENV_URLS.WS_URL.replace('http', 'ws')}/ws/chat/${roomId}`

  // Handle WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const wsEvent: WSEvent = JSON.parse(event.data)
      
      switch (wsEvent.type) {
        case 'message': {
          const messageEvent = wsEvent as MessageEvent
          addMessage(messageEvent.payload)
          onMessage?.(messageEvent.payload)
          break
        }
        
        case 'user_joined': {
          const userJoinedEvent = wsEvent as UserJoinedEvent
          addParticipant(userJoinedEvent.payload.user)
          addToast({
            type: 'info',
            message: `${userJoinedEvent.payload.user.username} присоединился к чату`,
            duration: 3000
          })
          break
        }
        
        case 'user_left': {
          const userLeftEvent = wsEvent as UserLeftEvent
          removeParticipant(userLeftEvent.payload.userId)
          break
        }
        
        case 'typing': {
          const typingEvent = wsEvent as TypingEvent
          const { userId, username, isTyping } = typingEvent.payload
          
          if (isTyping) {
            addTypingUser({
              userId,
              username,
              timestamp: Date.now()
            })
          } else {
            removeTypingUser(userId)
          }
          break
        }
        
        case 'room_expired': {
          const expiredEvent = wsEvent as RoomExpiredEvent
          addToast({
            type: 'warning',
            title: 'Сессия завершена',
            message: expiredEvent.payload.reason,
            duration: 0 // Permanent
          })
          setConnectionStatus('disconnected')
          break
        }
        
        default:
          console.warn('Unknown WebSocket event:', wsEvent.type)
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }, [addMessage, addParticipant, removeParticipant, addTypingUser, removeTypingUser, addToast, setConnectionStatus, onMessage])

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setConnectionStatus('connecting')

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setConnectionStatus('connected')
        setReconnectCount(0)
        updateUserActivity()
        onConnect?.()
        
        // Send join message
        if (currentUser) {
          ws.send(JSON.stringify({
            type: 'join',
            payload: {
              userId: currentUser.id,
              username: currentUser.username
            }
          }))
        }
      }

      ws.onmessage = handleMessage

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setConnectionStatus('disconnected')
        onDisconnect?.()

        // Attempt reconnection if not manually closed
        if (!isManualClose && reconnectCount < reconnectAttempts) {
          const delay = reconnectInterval * Math.pow(2, reconnectCount) // Exponential backoff
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectCount(prev => prev + 1)
            connect()
          }, delay)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('error')
        onError?.(error)
      }

    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setConnectionStatus('error')
    }
  }, [wsUrl, currentUser, reconnectCount, reconnectAttempts, reconnectInterval, isManualClose, setConnectionStatus, updateUserActivity, onConnect, onDisconnect, onError, handleMessage])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    setIsManualClose(true)
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }
    
    setConnectionStatus('disconnected')
  }, [setConnectionStatus])

  // Send message through WebSocket
  const sendMessage = useCallback((content: string, type: 'text' | 'image' = 'text') => {
    const ws = wsRef.current
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }
    
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    const message = {
      type: 'message',
      payload: {
        content,
        type,
        senderId: currentUser.id,
        senderName: currentUser.username,
        timestamp: new Date().toISOString()
      }
    }

    ws.send(JSON.stringify(message))
    updateUserActivity()
  }, [currentUser, updateUserActivity])

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    const ws = wsRef.current
    
    if (!ws || ws.readyState !== WebSocket.OPEN || !currentUser) {
      return
    }

    ws.send(JSON.stringify({
      type: 'typing',
      payload: {
        userId: currentUser.id,
        username: currentUser.username,
        isTyping
      }
    }))
  }, [currentUser])

  // Effect to manage connection
  useEffect(() => {
    if (currentUser && roomId) {
      setIsManualClose(false)
      connect()
    }

    return () => {
      disconnect()
    }
  }, [currentUser, roomId]) // Don't include connect/disconnect to avoid loops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  // Return connection utilities
  return {
    sendMessage,
    sendTyping,
    connect,
    disconnect,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    connectionState: wsRef.current?.readyState,
    reconnectCount
  }
}