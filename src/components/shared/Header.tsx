// src/components/shared/Header.tsx
import { Shield, Lock, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

interface HeaderProps {
  step?: number
  totalSteps?: number
  showProgress?: boolean
  title?: string
  subtitle?: string
  showProtocolIndicator?: boolean
  className?: string
}

export function Header({ 
  step, 
  totalSteps, 
  showProgress = false,
  title = "Act Talk",
  subtitle = "Безопасное временное общение",
  showProtocolIndicator = true,
  className 
}: HeaderProps) {
  const progressValue = step && totalSteps ? (step / totalSteps) * 100 : 0

  return (
    <header className={cn(
      "bg-gradient-to-r from-orange-500 to-red-500 text-white",
      "shadow-lg backdrop-blur-sm",
      className
    )}>
      <div className="container mx-auto px-4 py-6">
        {/* Заголовок и индикатор протокола */}
        <div className="flex flex-col items-center text-center mb-4">
          <h1 className="text-3xl md:text-4xl font-light tracking-wider mb-2">
            {title}
          </h1>
          
          <p className="text-white/90 text-sm md:text-base mb-4">
            {subtitle}
          </p>
          
          {showProtocolIndicator && (
            <ProtocolIndicator />
          )}
        </div>

        {/* Прогресс-бар */}
        {showProgress && step && totalSteps && (
          <div className="w-full max-w-md mx-auto">
            <div className="flex justify-between text-xs mb-2">
              <span>Шаг {step} из {totalSteps}</span>
              <span>{Math.round(progressValue)}%</span>
            </div>
            <Progress 
              value={progressValue} 
              className="h-2 bg-white/20"
            />
          </div>
        )}
      </div>
    </header>
  )
}

// Индикатор протокола Matrix
function ProtocolIndicator() {
  return (
    <div className="inline-flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full border border-white/20">
      <Shield className="w-4 h-4" />
      <span className="text-sm font-medium">Matrix Protocol</span>
      <div className="flex gap-1 ml-2">
        <Lock className="w-3 h-3" />
        <Users className="w-3 h-3" />
      </div>
    </div>
  )
}

// Варианты заголовков для разных страниц
export function ChatHeader({ roomId, participantCount }: { roomId: string, participantCount: number }) {
  return (
    <Header 
      title={`Комната ${roomId}`}
      subtitle={`${participantCount} участник${participantCount !== 1 ? 'ов' : ''}`}
      showProtocolIndicator={true}
      className="py-4"
    />
  )
}

export function StepHeader({ currentStep, totalSteps }: { currentStep: number, totalSteps: number }) {
  return (
    <Header 
      step={currentStep}
      totalSteps={totalSteps}
      showProgress={true}
      showProtocolIndicator={true}
    />
  )
}