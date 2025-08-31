'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChatContainer } from '@/components/chat/ChatContainer'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useChatStore } from '@/store/chatStore'
import { useUserStore } from '@/store/userStore'
import { useUIStore } from '@/store/uiStore'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'

interface ChatPageProps {
  params: Promise<{ roomId: string }>
}

function ChatPageContent({ roomId }: { roomId: string }) {
  const router = useRouter()
  
  // Zustand stores
  const { currentUser } = useUserStore()
  const { 
    currentRoom, 
    isConnected, 
    connectionStatus, 
    setRoom,
    setMessages,
    setParticipants,
    clearRoom,
    setConnectionStatus
  } = useChatStore()
  
  const { 
    isLoading, 
    error, 
    setLoading, 
    setError, 
    clearError 
  } = useUIStore()

  // Initialize chat room
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setLoading(true)
        clearError()
        
        // Check if user exists
        if (!currentUser) {
          router.push('/?error=no_user')
          return
        }
        
        // Try to get room info
        const roomResponse = await apiClient.rooms.getRoom(roomId)
        
        if (!roomResponse.success) {
          // Try to join with stored PIN code
          const storedPin = localStorage.getItem(`pin_${roomId}`)
          if (storedPin) {
            const joinResponse = await apiClient.rooms.joinRoom(storedPin, currentUser.username)
            if (joinResponse.success) {
              setRoom(joinResponse.data.room)
            } else {
              throw new Error('Не удалось подключиться к комнате')
            }
          } else {
            throw new Error('Комната не найдена')
          }
        } else {
          setRoom(roomResponse.data.room)
        }
        
        // Load messages
        const messagesResponse = await apiClient.messages.getMessages(roomId)
        if (messagesResponse.success) {
          setMessages(messagesResponse.data.messages)
        }
        
        // Load participants  
        const participantsResponse = await apiClient.rooms.getParticipants(roomId)
        if (participantsResponse.success) {
          setParticipants(participantsResponse.data.participants)
        }
        
        setConnectionStatus('connected')
        
      } catch (err) {
        console.error('Failed to initialize chat:', err)
        const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки чата'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }
    
    initializeChat()
    
    // Cleanup on unmount
    return () => {
      clearRoom()
    }
  }, [roomId, currentUser, router])

  const handleSessionExpired = () => {
    clearRoom()
    router.push('/?expired=true')
  }
  
  const handleRetry = () => {
    window.location.reload()
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              Подключение к комнате
            </h2>
            <p className="text-sm text-gray-600">
              Загрузка чата...
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-500 text-6xl mb-6">😔</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-3">
            Не удалось подключиться к комнате
          </h1>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full">
              Повторить попытку
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/')} 
              className="w-full"
            >
              Вернуться на главную
            </Button>
          </div>
        </div>
      </div>
    )
  }
  
  // Main chat interface
  if (!currentRoom) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Подготовка чата...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ChatContainer 
        roomId={roomId}
        onSessionExpired={handleSessionExpired}
      />
    </div>
  )
}

// Main page component
export default function ChatPage({ params }: ChatPageProps) {
  const { roomId } = use(params) // Next.js 15 compatible
  
  return (
    <ErrorBoundary>
      <ChatPageContent roomId={roomId} />
    </ErrorBoundary>
  )
}