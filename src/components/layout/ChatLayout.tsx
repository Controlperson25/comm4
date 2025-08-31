// src/components/layout/ChatLayout.tsx
import { ReactNode } from "react"
import { Header } from "@/components/shared/Header"
import { ProtocolIndicator, ConnectionStatus } from "@/components/shared/ProtocolIndicator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LogOut, Settings, Users, Timer } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatLayoutProps {
  children: ReactNode
  roomId?: string
  participantCount?: number
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error'
  timeRemaining?: string
  onLeave?: () => void
  onSettings?: () => void
  className?: string
}

export function ChatLayout({
  children,
  roomId,
  participantCount = 0,
  connectionStatus = 'connected',
  timeRemaining,
  onLeave,
  onSettings,
  className
}: ChatLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Заголовок чата */}
      <ChatHeader
        roomId={roomId}
        participantCount={participantCount}
        connectionStatus={connectionStatus}
        timeRemaining={timeRemaining}
        onLeave={onLeave}
        onSettings={onSettings}
      />
      
      {/* Основной контент чата */}
      <main className={cn("flex-1 flex flex-col", className)}>
        {children}
      </main>
      
      {/* Статус-бар */}
      <ChatStatusBar 
        connectionStatus={connectionStatus}
        timeRemaining={timeRemaining}
      />
    </div>
  )
}

// Заголовок чата
function ChatHeader({
  roomId,
  participantCount,
  connectionStatus,
  timeRemaining,
  onLeave,
  onSettings
}: {
  roomId?: string
  participantCount: number
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  timeRemaining?: string
  onLeave?: () => void
  onSettings?: () => void
}) {
  return (
    <header className="bg-white border-b shadow-sm px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Информация о комнате */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-semibold text-gray-900">
              {roomId ? `Комната ${roomId}` : 'Act Talk Chat'}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{participantCount} участник{participantCount !== 1 ? 'ов' : ''}</span>
              {timeRemaining && (
                <>
                  <span>•</span>
                  <Timer className="w-4 h-4" />
                  <span>{timeRemaining}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Статус и действия */}
        <div className="flex items-center gap-3">
          <ConnectionStatus status={connectionStatus} />
          <ProtocolIndicator variant="compact" />
          
          <div className="flex gap-2">
            {onSettings && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onSettings}
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
            
            {onLeave && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onLeave}
                className="text-red-600 hover:text-red-700"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

// Статус-бар внизу
function ChatStatusBar({
  connectionStatus,
  timeRemaining
}: {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  timeRemaining?: string
}) {
  if (connectionStatus === 'connected' && !timeRemaining) {
    return null // Скрываем если все хорошо
  }

  return (
    <div className="bg-gray-100 border-t px-4 py-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <ConnectionStatus status={connectionStatus} />
          {connectionStatus === 'error' && (
            <span className="text-red-600">
              Проблемы с подключением. Повторная попытка...
            </span>
          )}
        </div>
        
        {timeRemaining && (
          <Badge variant="outline" className="text-xs">
            <Timer className="w-3 h-3 mr-1" />
            {timeRemaining}
          </Badge>
        )}
      </div>
    </div>
  )
}

// Компонент для предупреждения об окончании сессии
export function SessionWarning({ 
  timeRemaining, 
  onExtend 
}: { 
  timeRemaining: string
  onExtend?: () => void 
}) {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <Timer className="w-5 h-5 text-yellow-400" />
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            <strong>Внимание!</strong> Сессия завершится через {timeRemaining}
          </p>
          {onExtend && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onExtend}
              className="mt-2"
            >
              Продлить сессию
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}