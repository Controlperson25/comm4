'use client'

import { useEffect, useRef } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useChatSelectors } from '@/store/chatStore'
import { useUserSelectors } from '@/store/userStore'

interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  timestamp: string
  type: 'text' | 'image' | 'system'
}

interface MessageListProps {
  messages?: Message[]
  currentUserId: string
  loading?: boolean
}

interface MessageItemProps {
  message: Message
  isOwn: boolean
  showAvatar?: boolean
  isConsecutive?: boolean
}

// Компонент для загрузки сообщений
function MessageSkeleton() {
  return (
    <div className="flex gap-3 p-4 animate-pulse">
      <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/4" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
    </div>
  )
}

// Компонент системного сообщения
function SystemMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-center py-2">
      <div className="bg-gray-100 rounded-full px-3 py-1 text-xs text-gray-600">
        {message.content}
      </div>
    </div>
  )
}

// Основной компонент сообщения
function MessageItem({ message, isOwn, showAvatar = true, isConsecutive = false }: MessageItemProps) {
  const timeAgo = formatDistanceToNow(new Date(message.timestamp), {
    addSuffix: true,
    locale: ru
  })
  
  // Системные сообщения
  if (message.type === 'system') {
    return <SystemMessage message={message} />
  }
  
  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${isConsecutive ? 'mt-1' : 'mt-4'}`}>
      {/* Аватар */}
      <div className={`flex-shrink-0 ${showAvatar && !isConsecutive ? 'visible' : 'invisible'}`}>
        <Avatar className="w-8 h-8">
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
            {message.senderName.charAt(0).toUpperCase()}
          </div>
        </Avatar>
      </div>
      
      {/* Сообщение */}
      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Имя и время (показываем только для не-последовательных сообщений) */}
        {!isConsecutive && (
          <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className="text-sm font-medium text-gray-900">
              {isOwn ? 'Вы' : message.senderName}
            </span>
            <span className="text-xs text-gray-500">
              {timeAgo}
            </span>
          </div>
        )}
        
        {/* Содержимое сообщения */}
        <div
          className={`rounded-2xl px-4 py-2 max-w-full break-words ${
            isOwn
              ? 'bg-blue-500 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          } ${isConsecutive ? 'rounded-t-md' : ''}`}
        >
          {message.type === 'text' ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : message.type === 'image' ? (
            <div className="text-sm">
              📷 {message.content}
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
        
        {/* Статус сообщения (только для своих сообщений) */}
        {isOwn && !isConsecutive && (
          <div className="flex items-center gap-1 mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-gray-500">
              {message.id.startsWith('temp_') ? 'Отправка...' : 'Доставлено'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Индикатор печатания
function TypingIndicator() {
  const typingUsers = useChatSelectors.typingUsers()
  
  if (typingUsers.length === 0) return null
  
  const names = typingUsers.map(user => user.username)
  const text = names.length === 1 
    ? `${names[0]} печатает...`
    : names.length === 2
    ? `${names[0]} и ${names[1]} печатают...`
    : `${names.slice(0, -1).join(', ')} и ${names[names.length - 1]} печатают...`
  
  return (
    <div className="flex gap-3 mt-4">
      <Avatar className="w-8 h-8 flex-shrink-0">
        <div className="w-full h-full bg-gray-300 flex items-center justify-center">
          <span className="text-xs">...</span>
        </div>
      </Avatar>
      
      <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-xs text-gray-600">{text}</span>
        </div>
      </div>
    </div>
  )
}

// Основной компонент списка сообщений
export function MessageList({ messages: propMessages, currentUserId, loading = false }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Используем сообщения из store или переданные как props
  const storeMessages = useChatSelectors.messages()
  const messages = propMessages || storeMessages
  
  const isConnected = useChatSelectors.isConnected()
  const hasMoreMessages = useChatSelectors.hasMoreMessages()
  
  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      })
    }
  }, [messages])
  
  // Группировка сообщений для определения последовательных
  const groupedMessages = messages.reduce((groups: Array<{
    message: Message
    isOwn: boolean
    showAvatar: boolean
    isConsecutive: boolean
  }>, message, index) => {
    const isOwn = message.senderId === currentUserId
    const prevMessage = messages[index - 1]
    const isConsecutive = prevMessage && 
      prevMessage.senderId === message.senderId && 
      prevMessage.type !== 'system' && 
      message.type !== 'system' &&
      new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime() < 5 * 60 * 1000 // 5 минут
    
    groups.push({
      message,
      isOwn,
      showAvatar: true,
      isConsecutive: !!isConsecutive
    })
    
    return groups
  }, [])
  
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-1">
        {loading && messages.length === 0 ? (
          // Показываем скелетоны при загрузке
          <>
            <MessageSkeleton />
            <MessageSkeleton />
            <MessageSkeleton />
          </>
        ) : messages.length === 0 ? (
          // Пустое состояние
          <div className="flex items-center justify-center h-full min-h-[300px] text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm">Пока нет сообщений</p>
              <p className="text-xs mt-1">Начните общение первым!</p>
            </div>
          </div>
        ) : (
          // Список сообщений
          <>
            {/* Индикатор "есть еще сообщения" */}
            {hasMoreMessages && (
              <div className="flex justify-center py-4">
                <Badge variant="outline" className="text-xs">
                  Загрузить предыдущие сообщения
                </Badge>
              </div>
            )}
            
            {/* Сообщения */}
            {groupedMessages.map(({ message, isOwn, showAvatar, isConsecutive }) => (
              <MessageItem
                key={message.id}
                message={message}
                isOwn={isOwn}
                showAvatar={showAvatar}
                isConsecutive={isConsecutive}
              />
            ))}
            
            {/* Индикатор печатания */}
            <TypingIndicator />
          </>
        )}
        
        {/* Индикатор отсутствия подключения */}
        {!isConnected && !loading && (
          <div className="flex justify-center py-4">
            <Badge variant="destructive" className="text-xs">
              Нет подключения к серверу
            </Badge>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}