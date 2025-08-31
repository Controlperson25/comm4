// src/app/debug/page.tsx
import { WebSocketTest } from '@/components/debug/WebSocketTest'

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">🛠️ Debug Tools</h1>
          <p className="text-muted-foreground">
            Инструменты для отладки WebSocket соединения
          </p>
        </div>
        
        <WebSocketTest />
      </div>
    </div>
  )
}