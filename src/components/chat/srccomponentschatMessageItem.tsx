'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/chat'

interface MessageItemProps {
  message: Message
  isOwn: boolean
  className?: string
}

export function MessageItem({
  message,
  isOwn,
  className
}: MessageItemProps) {
  const [imageError, setImageError] = useState(false)
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  
  return (
    <div className={cn(
      "flex gap-3",
      isOwn ? "flex-row-reverse" : "flex-row",
      className
    )}>
      {/* Avatar */}
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className={cn(
          "text-xs font-medium",
          isOwn ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
        )}>
          {getInitials(message.senderName)}
        </AvatarFallback>
      </Avatar>
      
      {/* Message Content */}
      <div className={cn(
        "flex flex-col max-w-[70%]",
        isOwn ? "items-end" : "items-start"
      )}>
        {/* Sender name (only for non-own messages) */}
        {!isOwn && (
          <span className="text-xs text-gray-500 mb-1 px-3">
            {message.senderName}
          </span>
        )}
        
        {/* Message bubble */}
        <div className={cn(
          "px-4 py-2 rounded-2xl max-w-full break-words",
          isOwn
            ? "bg-blue-500 text-white rounded-br-md"
            : "bg-gray-100 text-gray-900 rounded-bl-md"
        )}>
          {/* Text message */}
          {message.type === 'text' && (
            <p className="text-sm leading-relaxed">
              {message.content}
            </p>
          )}
          
          {/* Image message */}
          {message.type === 'image' && message.imageUrl && !imageError && (
            <div className="max-w-xs">
              <img
                src={message.imageUrl}
                alt={message.content}
                onError={() => setImageError(true)}
                className="rounded-lg cursor-pointer max-w-full h-auto"
                onClick={() => window.open(message.imageUrl, '_blank')}
              />
              {message.content && (
                <p className="text-xs mt-2 opacity-80">
                  {message.content}
                </p>
              )}
            </div>
          )}
          
          {/* Image error */}
          {message.type === 'image' && imageError && (
            <div className="text-red-500 text-sm">
              Не удалось загрузить изображение
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <time className={cn(
          "text-xs text-gray-500 mt-1",
          isOwn ? "mr-3" : "ml-3"
        )}>
          {format(new Date(message.timestamp), 'HH:mm')}
        </time>
      </div>
    </div>
  )
}