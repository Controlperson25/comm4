'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { Users, Timer, Settings, LogOut } from 'lucide-react'
import { useChatSelectors, useChatActions } from '@/store/chatStore'
import { useUserSelectors } from '@/store/userStore'
import { useUISelectors, useNotifications, useModal } from '@/store/uiStore'
import { integratedAPI } from '@/lib/api'

interface RoomData {
  id: string
  name: string
  pinCode: string
  participantCount: number
  expiresAt: string
  isActive: boolean
}

interface SessionData {
  roomId: string
  userId: string
  username: string
  role: 'creator' | 'participant'
  joinedAt: string
  expiresAt: string
}

interface ChatContainerProps {
  roomId: string
  roomData: RoomData
  sessionData: SessionData
  onSessionExpired: () => void
}

export function ChatContainer({ roomId, roomData, sessionData, onSessionExpired }: ChatContainerProps) {
  // Store hooks
  const messages = useChatSelectors.messages()
  const participants = useChatSelectors.participants()
  const isConnected = useChatSelectors.isConnected()
  const isSending = useChatSelectors.isSending()
  const connectionStatus = useChatSelectors.connectionStatus()
  const currentSession = useChatSelectors.currentSession()
  
  const chatActions = useChatActions()
  const notifications = useNotifications()
  const modal = useModal()
  
  // Local state for timer
  const [timeRemaining, setTimeRemaining] = useState('59:30')
  const [showWarning, setShowWarning] = useState(false)
  
  // Таймер сессии
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const expires = new Date(roomData.expiresAt)
      const diff = expires.getTime() - now.getTime()
      
      if (diff <= 0) {
        onSessionExpired()
        return
      }
      
      const minutes = Math.floor(diff / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      
      // Показать предупреждение за 5 минут до истечения
      setShowWarning(minutes <= 5)
      
      // Предупреждение за 1 минуту
      if (minutes === 1 && seconds === 0) {
        notifications.addWarning(
          'Сессия завершается',
          'Осталась 1 минута до завершения сессии'
        )
      }
    }
    
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [roomData.expiresAt, onSessionExpired, notifications])
  
  // Инициализация состояния комнаты
  useEffect(() => {
    if (!currentSession || currentSession.roomId !== roomId) {
      chatActions.setCurrentSession({
        id: `session_${Date.now()}`,
        userId: sessionData.userId,
        username: sessionData.username,
        roomId: sessionData.roomId,
        role: sessionData.role,
        createdAt: sessionData.joinedAt,
        expiresAt: sessionData.expiresAt,
        isActive: true
      })
    }
  }, [roomId, sessionData, currentSession, chatActions])
  
  // Загрузка сообщений при входе
  useEffect(() => {
    if (messages.length === 0 && isConnected) {
      integratedAPI.loadRoomMessages(roomId, sessionData.userId)
        .catch(error => {
          console.error('Failed to load messages:', error)
        })
    }
  }, [roomId, sessionData.userId, messages.length, isConnected])
  
  // Обработчик отправки сообщения
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isSending || !isConnected) return
    
    try {
      await integratedAPI.sendMessage({
        roomId,
        content: content.trim(),
        sessionId: sessionData.userId,
        type: 'text'
      })
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }
  
  // Обработчик отправки изображения
  const handleSendImage = async (file: File) => {
    if (!isConnected) {
      notifications.addError('Ошибка', 'Нет подключения к серверу')
      return
    }
    
    try {
      await integratedAPI.sendImage(roomId, file, sessionData.userId)
    } catch (error) {
      console.error('Failed to send image:', error)
    }
  }
  
  // Обработчик выхода из комнаты
  const handleLeaveRoom = () => {
    modal.openLeaveConfirm(async () => {
      try {
        await integratedAPI.leaveRoom(roomId, sessionData.username)
        onSessionExpired() // Перенаправляем на главную
      } catch (error) {
        console.error('Failed to leave room:', error)
      }
    })
  }
  
  // Обработчик настроек
  const handleSettings = () => {
    modal.openSettings()
  }
  
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Предупреждение о завершении сессии */}
      {showWarning && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
          <div className="flex items-center">
            <Timer className="w-4 h-4 text-yellow-600 mr-2" />
            <span className="text-sm text-yellow-700">
              Сессия завершится через {timeRemaining}
            </span>
          </div>
        </div>
      )}
      
      {/* Заголовок чата */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-semibold text-gray-900">
              {roomData.name}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{participants.length} участник{participants.length !== 1 ? 'ов' : ''}</span>
              <span>•</span>
              <Timer className="w-4 h-4" />
              <span>{timeRemaining}</span>
              {sessionData.role === 'creator' && (
                <>
                  <span>•</span>
                  <span className="text-blue-600 font-medium">Создатель</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Статус подключения */}
          <Badge variant={isConnected ? "default" : "destructive"}>
            {connectionStatus === 'connected' && 'Подключен'}
            {connectionStatus === 'connecting' && 'Подключение...'}
            {connectionStatus === 'disconnected' && 'Отключен'}
            {connectionStatus === 'error' && 'Ошибка'}
          </Badge>
          
          {/* Кнопки управления */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleSettings}
          >
            <Settings className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleLeaveRoom}
            className="text-red-600 hover:text-red-700"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Область сообщений */}
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={messages} 
          currentUserId={sessionData.userId}
          loading={connectionStatus === 'connecting'}
        />
      </div>

      {/* Ввод сообщения */}
      <div className="border-t bg-white">
        <MessageInput 
          onSendMessage={handleSendMessage}
          onSendImage={handleSendImage}
          disabled={!isConnected || isSending}
          placeholder={
            !isConnected ? 'Подключение...' : 
            isSending ? 'Отправка...' : 
            'Введите сообщение...'
          }
        />
      </div>

      {/* Статус бар для ошибок */}
      {connectionStatus === 'error' && (
        <div className="bg-red-50 border-t px-4 py-2">
          <div className="flex items-center justify-center text-sm text-red-600">
            Проблемы с подключением. Повторная попытка...
          </div>
        </div>
      )}
      
      {connectionStatus === 'disconnected' && (
        <div className="bg-yellow-50 border-t px-4 py-2">
          <div className="flex items-center justify-center text-sm text-yellow-600">
            Подключение потеряно. Попытка восстановления...
          </div>
        </div>
      )}
    </div>
  )
}