// src/hooks/useMatrix.ts
import { useState, useEffect, useCallback } from 'react'
import { matrixClient } from '@/lib/matrix/client'
import { useChatStore } from '@/store/chatStore'
import { useUserStore } from '@/store/userStore'
import type { ConnectionStatus, Message, Room } from '@/types/chat'

export interface UseMatrixOptions {
  autoConnect?: boolean
  reconnectOnError?: boolean
  onMessage?: (message: Message) => void
  onRoomJoined?: (room: Room) => void
  onError?: (error: Error) => void
}

export function useMatrix(options: UseMatrixOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  
  const currentUser = useUserStore(state => state.currentUser)
  const chatActions = useChatStore(state => ({
    addMessage: state.addMessage,
    setCurrentRoom: state.setCurrentRoom,
    setConnectionStatus: state.setConnectionStatus
  }))
  
  // Initialize Matrix client
  const initialize = useCallback(async () => {
    if (!currentUser?.matrixUserId) {
      throw new Error('No Matrix user ID available')
    }
    
    try {
      setConnectionStatus('connecting')
      setError(null)
      
      const accessToken = localStorage.getItem('matrix_token')
      const deviceId = localStorage.getItem('matrix_device_id')
      
      if (!accessToken) {
        throw new Error('No access token available')
      }
      
      await matrixClient.initialize({
        homeserverUrl: process.env.NEXT_PUBLIC_MATRIX_HOMESERVER || 'https://matrix.org',
        serverName: process.env.NEXT_PUBLIC_MATRIX_SERVER_NAME || 'matrix.org',
        userId: currentUser.matrixUserId,
        accessToken,
        deviceId: deviceId || undefined
      })
      
      setIsConnected(true)
      setConnectionStatus('connected')
      chatActions.setConnectionStatus('connected')
      
    } catch (error: any) {
      console.error('Matrix initialization failed:', error)
      setError(error.message)
      setConnectionStatus('error')
      chatActions.setConnectionStatus('error')
      
      if (options.onError) {
        options.onError(error)
      }
      
      throw error
    }
  }, [currentUser, options.onError])
  
  // Connect to Matrix
  const connect = useCallback(async () => {
    try {
      if (!matrixClient.isConnected()) {
        await initialize()
      }
    } catch (error: any) {
      console.error('Failed to connect:', error.message)
    }
  }, [initialize])
  
  // Disconnect from Matrix
  const disconnect = useCallback(async () => {
    try {
      await matrixClient.disconnect()
      setIsConnected(false)
      setConnectionStatus('disconnected')
      chatActions.setConnectionStatus('disconnected')
    } catch (error: any) {
      console.error('Matrix disconnect failed:', error)
    }
  }, [chatActions])
  
  // Send message
  const sendMessage = useCallback(async (roomId: string, content: string) => {
    if (!isConnected) {
      throw new Error('Matrix client not connected')
    }
    
    try {
      const message = await matrixClient.sendMessage(roomId, content)
      return message
    } catch (error: any) {
      console.error('Failed to send message:', error)
      throw error
    }
  }, [isConnected])
  
  // Create room
  const createRoom = useCallback(async (options: {
    name?: string
    pinCode: string
    encrypted?: boolean
    expirationMinutes?: number
  }) => {
    if (!isConnected) {
      throw new Error('Matrix client not connected')
    }
    
    try {
      const room = await matrixClient.createRoom(options)
      return room
    } catch (error: any) {
      console.error('Failed to create room:', error)
      throw error
    }
  }, [isConnected])
  
  // Join room
  const joinRoom = useCallback(async (roomId: string, pinCode?: string) => {
    if (!isConnected) {
      throw new Error('Matrix client not connected')
    }
    
    try {
      const room = await matrixClient.joinRoom(roomId, pinCode)
      chatActions.setCurrentRoom(room)
      
      if (options.onRoomJoined) {
        options.onRoomJoined(room)
      }
      
      return room
    } catch (error: any) {
      console.error('Failed to join room:', error)
      throw error
    }
  }, [isConnected, options.onRoomJoined, chatActions])
  
  // Leave room
  const leaveRoom = useCallback(async (roomId: string) => {
    if (!isConnected) {
      throw new Error('Matrix client not connected')
    }
    
    try {
      await matrixClient.leaveRoom(roomId)
      chatActions.setCurrentRoom(null)
    } catch (error: any) {
      console.error('Failed to leave room:', error)
      throw error
    }
  }, [isConnected, chatActions])
  
  // Send typing indicator
  const sendTyping = useCallback((roomId: string, typing: boolean) => {
    if (isConnected) {
      matrixClient.sendTyping(roomId, typing)
    }
  }, [isConnected])
  
  // Generate PIN code (simple version)
  const generatePinCode = useCallback(() => {
    return Math.floor(Math.random() * 9000 + 1000).toString()
  }, [])
  
  // Setup event listeners
  useEffect(() => {
    if (!matrixClient) return
    
    const handleMessage = (message: Message) => {
      chatActions.addMessage(message)
      if (options.onMessage) {
        options.onMessage(message)
      }
    }
    
    const handleRoomJoined = (room: Room) => {
      chatActions.setCurrentRoom(room)
      if (options.onRoomJoined) {
        options.onRoomJoined(room)
      }
    }
    
    const handleConnectionStatus = (status: ConnectionStatus) => {
      setConnectionStatus(status)
      setIsConnected(status === 'connected')
      chatActions.setConnectionStatus(status)
    }
    
    const handleError = (error: any) => {
      setError(error.message || 'Matrix error')
      if (options.onError) {
        options.onError(error)
      }
    }
    
    // Subscribe to events
    matrixClient.on('message:received', handleMessage)
    matrixClient.on('room:joined', handleRoomJoined)
    matrixClient.on('connection:status', handleConnectionStatus)
    matrixClient.on('client:error', handleError)
    
    // Auto-connect if requested
    if (options.autoConnect && currentUser && !isConnected) {
      connect()
    }
    
    // Cleanup
    return () => {
      matrixClient.off('message:received', handleMessage)
      matrixClient.off('room:joined', handleRoomJoined)
      matrixClient.off('connection:status', handleConnectionStatus)
      matrixClient.off('client:error', handleError)
    }
  }, [currentUser, isConnected, options, connect, chatActions])
  
  return {
    // State
    isConnected,
    connectionStatus,
    error,
    
    // Actions
    connect,
    disconnect,
    sendMessage,
    createRoom,
    joinRoom,
    leaveRoom,
    sendTyping,
    generatePinCode,
    
    // Utils
    client: matrixClient
  }
}