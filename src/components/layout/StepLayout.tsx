// src/components/layout/StepLayout.tsx
import { ReactNode } from "react"
import { Header } from "@/components/shared/Header"
import { Container } from "@/components/shared/Container"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepLayoutProps {
  currentStep: number
  totalSteps: number
  children: ReactNode
  title?: string
  subtitle?: string
  onPrevious?: () => void
  onNext?: () => void
  canGoBack?: boolean
  canGoNext?: boolean
  nextLabel?: string
  previousLabel?: string
  className?: string
}

export function StepLayout({
  currentStep,
  totalSteps,
  children,
  title,
  subtitle,
  onPrevious,
  onNext,
  canGoBack = true,
  canGoNext = false,
  nextLabel = "Далее",
  previousLabel = "Назад",
  className
}: StepLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header 
        step={currentStep}
        totalSteps={totalSteps}
        title={title}
        subtitle={subtitle}
        showProgress={true}
      />
      
      <main className={cn("py-8", className)}>
        <Container size="md">
          {/* Контент шага */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="max-w-md mx-auto">
              {children}
            </div>
          </div>
          
          {/* Навигация */}
          <StepNavigation
            currentStep={currentStep}
            totalSteps={totalSteps}
            onPrevious={onPrevious}
            onNext={onNext}
            canGoBack={canGoBack && currentStep > 1}
            canGoNext={canGoNext}
            nextLabel={nextLabel}
            previousLabel={previousLabel}
          />
        </Container>
      </main>
    </div>
  )
}

// Навигация между шагами
function StepNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  canGoBack,
  canGoNext,
  nextLabel,
  previousLabel
}: {
  currentStep: number
  totalSteps: number
  onPrevious?: () => void
  onNext?: () => void
  canGoBack: boolean
  canGoNext: boolean
  nextLabel: string
  previousLabel: string
}) {
  return (
    <div className="flex justify-between items-center">
      {/* Кнопка "Назад" */}
      <div>
        {canGoBack && onPrevious ? (
          <Button 
            variant="outline" 
            onClick={onPrevious}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {previousLabel}
          </Button>
        ) : (
          <div /> // Пустой div для выравнивания
        )}
      </div>

      {/* Индикаторы шагов */}
      <StepIndicators 
        currentStep={currentStep} 
        totalSteps={totalSteps} 
      />

      {/* Кнопка "Далее" */}
      <div>
        {onNext && (
          <Button 
            onClick={onNext}
            disabled={!canGoNext}
            className="flex items-center gap-2"
          >
            {nextLabel}
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Индикаторы шагов (точки)
function StepIndicators({ 
  currentStep, 
  totalSteps 
}: { 
  currentStep: number
  totalSteps: number 
}) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1
        const isActive = stepNumber === currentStep
        const isCompleted = stepNumber < currentStep
        
        return (
          <div
            key={stepNumber}
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-200",
              {
                "bg-primary scale-125": isActive,
                "bg-primary/60": isCompleted,
                "bg-gray-300": !isActive && !isCompleted
              }
            )}
          />
        )
      })}
    </div>
  )
}

// Специализированные layout для конкретных шагов
export function UsernameStepLayout({ children, ...props }: Omit<StepLayoutProps, 'title' | 'subtitle'>) {
  return (
    <StepLayout 
      title="Добро пожаловать"
      subtitle="Выберите имя пользователя для начала"
      {...props}
    >
      {children}
    </StepLayout>
  )
}

export function RoomStepLayout({ children, ...props }: Omit<StepLayoutProps, 'title' | 'subtitle'>) {
  return (
    <StepLayout 
      title="Создание комнаты"
      subtitle="Создайте безопасную комнату для общения"
      {...props}
    >
      {children}
    </StepLayout>
  )
}