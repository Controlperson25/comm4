'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ENV_URLS } from '@/constants/routes'

interface ConnectionTest {
  step: string
  status: 'pending' | 'success' | 'error'
  message: string
  timestamp?: string
}

export function WebSocketTest() {
  const [tests, setTests] = useState<ConnectionTest[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [receivedMessages, setReceivedMessages] = useState<any[]>([])
  const [connectionInfo, setConnectionInfo] = useState({
    wsUrl: '',
    readyState: WebSocket.CLOSED,
    protocol: '',
    extensions: ''
  })
  
  const addTest = (step: string, status: 'pending' | 'success' | 'error', message: string) => {
    setTests(prev => [...prev, {
      step,
      status,
      message,
      timestamp: new Date().toLocaleTimeString()
    }])
  }

  const clearTests = () => {
    setTests([])
    setReceivedMessages([])
  }

  const updateConnectionInfo = (websocket: WebSocket | null) => {
    if (!websocket) {
      setConnectionInfo({
        wsUrl: '',
        readyState: WebSocket.CLOSED,
        protocol: '',
        extensions: ''
      })
      return
    }

    setConnectionInfo({
      wsUrl: websocket.url,
      readyState: websocket.readyState,
      protocol: websocket.protocol,
      extensions: websocket.extensions
    })
  }

  const getReadyStateText = (state: number) => {
    switch (state) {
      case WebSocket.CONNECTING: return 'CONNECTING (0)'
      case WebSocket.OPEN: return 'OPEN (1)'
      case WebSocket.CLOSING: return 'CLOSING (2)'
      case WebSocket.CLOSED: return 'CLOSED (3)'
      default: return `UNKNOWN (${state})`
    }
  }

  const testBasicConnection = async () => {
    clearTests()
    
    // Test 1: Environment check
    addTest('Environment', 'pending', 'Проверяем environment переменные...')
    
    const wsUrl = ENV_URLS.WS_URL + '/ws'
    addTest('Environment', 'success', `WS URL: ${wsUrl}`)
    
    if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
      addTest('Environment', 'error', 'WebSocket URL должен начинаться с ws:// или wss://')
      return
    }

    // Test 2: Create connection
    addTest('Connection', 'pending', 'Создаем WebSocket соединение...')
    
    try {
      const websocket = new WebSocket(wsUrl)
      setWs(websocket)
      updateConnectionInfo(websocket)

      let connectionTimeout: NodeJS.Timeout

      websocket.onopen = () => {
        clearTimeout(connectionTimeout)
        setIsConnected(true)
        updateConnectionInfo(websocket)
        addTest('Connection', 'success', 'WebSocket соединение установлено!')
        
        // Send initial handshake
        addTest('Handshake', 'pending', 'Отправляем приветствие...')
        
        websocket.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString(),
          clientId: 'debug-client',
          data: { message: 'Hello from debug client' }
        }))
        
        addTest('Handshake', 'success', 'Приветствие отправлено')
      }

      websocket.onmessage = (event) => {
        addTest('Message', 'success', 'Получено сообщение от сервера')
        
        try {
          const message = JSON.parse(event.data)
          setReceivedMessages(prev => [...prev, {
            ...message,
            receivedAt: new Date().toISOString(),
            raw: event.data
          }])
        } catch (error) {
          setReceivedMessages(prev => [...prev, {
            raw: event.data,
            receivedAt: new Date().toISOString(),
            parseError: true,
            error: error instanceof Error ? error.message : 'Parse error'
          }])
        }
      }

      websocket.onclose = (event) => {
        clearTimeout(connectionTimeout)
        setIsConnected(false)
        updateConnectionInfo(websocket)
        
        const reason = event.reason || 'No reason provided'
        const wasClean = event.wasClean ? 'Clean' : 'Unclean'
        
        addTest('Connection', 'error', 
          `Соединение закрыто: код ${event.code}, причина: "${reason}", тип: ${wasClean}`)
      }

      websocket.onerror = (error) => {
        clearTimeout(connectionTimeout)
        setIsConnected(false)
        updateConnectionInfo(websocket)
        addTest('Connection', 'error', 'WebSocket ошибка соединения')
        console.error('WebSocket error:', error)
      }

      // Timeout for connection
      connectionTimeout = setTimeout(() => {
        if (websocket.readyState === WebSocket.CONNECTING) {
          websocket.close()
          addTest('Connection', 'error', 'Timeout: сервер не отвечает (10 секунд)')
        }
      }, 10000)

    } catch (error) {
      addTest('Connection', 'error', 
        `Ошибка создания WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const testServerPing = () => {
    if (!ws || !isConnected) {
      addTest('Ping', 'error', 'WebSocket не подключен')
      return
    }

    addTest('Ping', 'pending', 'Отправляем ping...')
    
    const pingMessage = {
      type: 'ping',
      timestamp: new Date().toISOString(),
      id: `ping-${Date.now()}`
    }
    
    try {
      ws.send(JSON.stringify(pingMessage))
      addTest('Ping', 'success', 'Ping отправлен')
    } catch (error) {
      addTest('Ping', 'error', 
        `Ошибка отправки ping: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const testRoomFlow = () => {
    if (!ws || !isConnected) {
      addTest('Room Flow', 'error', 'WebSocket не подключен')
      return
    }

    addTest('Room Flow', 'pending', 'Тестируем flow создания комнаты...')
    
    // Step 1: Join room
    const joinMessage = {
      type: 'join_room',
      roomId: 'debug-room-123',
      userId: 'debug-user-456',
      username: 'DebugUser',
      timestamp: new Date().toISOString()
    }
    
    ws.send(JSON.stringify(joinMessage))
    addTest('Room Flow', 'success', 'Запрос на присоединение отправлен')
    
    // Step 2: Send chat message after delay
    setTimeout(() => {
      const chatMessage = {
        type: 'message',
        roomId: 'debug-room-123',
        userId: 'debug-user-456',
        username: 'DebugUser',
        data: {
          content: 'Тестовое сообщение из debug',
          type: 'text'
        },
        timestamp: new Date().toISOString()
      }
      
      ws.send(JSON.stringify(chatMessage))
      addTest('Room Flow', 'success', 'Тестовое сообщение отправлено')
    }, 1000)
    
    // Step 3: Test typing indicator
    setTimeout(() => {
      const typingMessage = {
        type: 'typing',
        roomId: 'debug-room-123',
        userId: 'debug-user-456',
        username: 'DebugUser',
        data: { isTyping: true },
        timestamp: new Date().toISOString()
      }
      
      ws.send(JSON.stringify(typingMessage))
      addTest('Room Flow', 'success', 'Индикатор печати отправлен')
      
      // Stop typing after 2 seconds
      setTimeout(() => {
        const stopTypingMessage = {
          ...typingMessage,
          data: { isTyping: false }
        }
        ws.send(JSON.stringify(stopTypingMessage))
      }, 2000)
    }, 2000)
  }

  const disconnectWebSocket = () => {
    if (ws) {
      ws.close(1000, 'Manual disconnect from debug')
      setWs(null)
      setIsConnected(false)
      addTest('Disconnect', 'success', 'Соединение закрыто вручную')
    }
  }

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [ws])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 border-green-300">✅ Успех</Badge>
      case 'error':
        return <Badge variant="destructive">❌ Ошибка</Badge>
      case 'pending':
        return <Badge variant="secondary">⏳ В процессе</Badge>
      default:
        return <Badge variant="outline">❓ Неизвестно</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>🔌 WebSocket Connection Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Соединение</h4>
              <div className="space-y-1 text-sm">
                <div>Статус: {isConnected ? 
                  <span className="text-green-600 font-medium">✅ Подключено</span> : 
                  <span className="text-red-600 font-medium">❌ Не подключено</span>
                }</div>
                <div>Ready State: <code>{getReadyStateText(connectionInfo.readyState)}</code></div>
                <div>URL: <code className="break-all">{connectionInfo.wsUrl || 'N/A'}</code></div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Конфигурация</h4>
              <div className="space-y-1 text-sm">
                <div>Env WS_URL: <code className="break-all">{ENV_URLS.WS_URL}</code></div>
                <div>Full URL: <code className="break-all">{ENV_URLS.WS_URL}/ws</code></div>
                <div>Protocol: <code>{connectionInfo.protocol || 'N/A'}</code></div>
              </div>
            </div>
          </div>
          
          {/* Control Buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button onClick={testBasicConnection} disabled={isConnected} variant="default">
              🔍 Тест соединения
            </Button>
            <Button onClick={testServerPing} disabled={!isConnected} variant="outline">
              📡 Ping сервера
            </Button>
            <Button onClick={testRoomFlow} disabled={!isConnected} variant="outline">
              🏠 Тест комнаты
            </Button>
            <Button onClick={disconnectWebSocket} disabled={!isConnected} variant="outline">
              🔌 Отключиться
            </Button>
            <Button onClick={clearTests} variant="ghost">
              🗑️ Очистить
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {tests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Результаты тестов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tests.map((test, index) => (
                <div key={index} className="flex items-start justify-between p-3 border rounded-lg bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{test.step}</div>
                    <div className="text-sm text-muted-foreground break-words">{test.message}</div>
                    {test.timestamp && (
                      <div className="text-xs text-muted-foreground mt-1">{test.timestamp}</div>
                    )}
                  </div>
                  <div className="ml-2 flex-shrink-0">{getStatusBadge(test.status)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Received Messages */}
      {receivedMessages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📨 Полученные сообщения ({receivedMessages.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className