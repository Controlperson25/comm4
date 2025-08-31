// src/components/shared/ProtocolIndicator.tsx
import { Shield, Lock, Users, Zap, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProtocolIndicatorProps {
  variant?: 'default' | 'compact' | 'detailed'
  className?: string
  showFeatures?: boolean
}

export function ProtocolIndicator({ 
  variant = 'default',
  className,
  showFeatures = false 
}: ProtocolIndicatorProps) {
  if (variant === 'compact') {
    return (
      <div className={cn(
        "inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full",
        className
      )}>
        <Shield className="w-3 h-3" />
        <span>Matrix</span>
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 text-white/90">
          <Shield className="w-5 h-5" />
          <span className="font-medium">Matrix Protocol</span>
        </div>
        
        {showFeatures && (
          <div className="flex gap-4 text-xs text-white/80">
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>E2E шифрование</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Временность</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>P2P</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn(
      "inline-flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full border border-white/20 text-white",
      className
    )}>
      <Shield className="w-4 h-4" />
      <span className="text-sm font-medium">Matrix Protocol</span>
      <div className="flex gap-1 ml-2">
        <Lock className="w-3 h-3" />
        <Users className="w-3 h-3" />
      </div>
    </div>
  )
}

// Статус подключения
export function ConnectionStatus({ 
  status, 
  className 
}: { 
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  className?: string 
}) {
  const statusConfig = {
    connecting: { 
      icon: <Zap className="w-3 h-3 animate-pulse" />, 
      text: 'Подключение...', 
      color: 'bg-yellow-100 text-yellow-800' 
    },
    connected: { 
      icon: <Shield className="w-3 h-3" />, 
      text: 'Подключено', 
      color: 'bg-green-100 text-green-800' 
    },
    disconnected: { 
      icon: <Users className="w-3 h-3" />, 
      text: 'Отключено', 
      color: 'bg-gray-100 text-gray-800' 
    },
    error: { 
      icon: <Lock className="w-3 h-3" />, 
      text: 'Ошибка', 
      color: 'bg-red-100 text-red-800' 
    }
  }

  const config = statusConfig[status]

  return (
    <div className={cn(
      "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full",
      config.color,
      className
    )}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  )
}