// src/components/shared/Container.tsx
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface ContainerProps {
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  center?: boolean
}

export function Container({ 
  children, 
  className, 
  size = 'md',
  center = false 
}: ContainerProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg', 
    xl: 'max-w-xl',
    full: 'max-w-full'
  }
  
  return (
    <div className={cn(
      "mx-auto px-4",
      sizeClasses[size],
      center && "flex items-center justify-center min-h-screen",
      className
    )}>
      {children}
    </div>
  )
}

// Специализированные контейнеры
export function PageContainer({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <Container size="lg" className={cn("py-8", className)}>
      {children}
    </Container>
  )
}

export function ChatContainer({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <div className={cn("h-screen flex flex-col", className)}>
      {children}
    </div>
  )
}

export function CenteredContainer({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <Container center className={cn("text-center", className)}>
      {children}
    </Container>
  )
}