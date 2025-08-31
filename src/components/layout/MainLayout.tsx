// src/components/layout/MainLayout.tsx
import { ReactNode } from "react"
import { Header } from "@/components/shared/Header"
import { cn } from "@/lib/utils"

interface MainLayoutProps {
  children: ReactNode
  className?: string
  showHeader?: boolean
  headerProps?: any
}

export function MainLayout({ 
  children, 
  className,
  showHeader = true,
  headerProps 
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {showHeader && <Header {...headerProps} />}
      
      <main className={cn("flex-1", className)}>
        {children}
      </main>
      
      <Footer />
    </div>
  )
}

// Футер
function Footer() {
  return (
    <footer className="py-6 text-center text-sm text-gray-600 border-t bg-white/50">
      <div className="container mx-auto px-4">
        <p>
          Act Talk Matrix • Безопасное временное общение • 
          <span className="font-medium"> Matrix Protocol</span>
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Анонимность • E2E шифрование • Самоуничтожающиеся сообщения
        </p>
      </div>
    </footer>
  )
}

// Специализированные layout
export function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <MainLayout 
      headerProps={{
        showProtocolIndicator: true,
        title: "Act Talk",
        subtitle: "Безопасное временное общение"
      }}
    >
      {children}
    </MainLayout>
  )
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <MainLayout 
      className="flex items-center justify-center py-8"
      headerProps={{
        showProtocolIndicator: true
      }}
    >
      <div className="w-full max-w-md mx-auto px-4">
        {children}
      </div>
    </MainLayout>
  )
}