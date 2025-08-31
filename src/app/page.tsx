'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
  UserPlus, 
  Users, 
  Shield, 
  KeyRound, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Clock,
  Lock,
  UserCheck
} from "lucide-react"

// Интерфейсы
interface JoinRoomData {
  username: string
  pinCode: string
  partnerUsername?: string
}

interface PinInputProps {
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
  showValue?: boolean
}

// Компонент PIN инпута
function PinInput({ value, onChange, error, disabled = false, showValue = false }: PinInputProps) {
  const handleChange = (index: number, digit: string) => {
    if (!/^\d?$/.test(digit)) return
    
    const newValue = value.split('')
    newValue[index] = digit
    onChange(newValue.join('').slice(0, 4))
    
    // Автофокус на следующий инпут
    if (digit && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`)
      nextInput?.focus()
    }
  }

  const displayValue = showValue ? value : '••••'.slice(0, value.length)

  return (
    <div className="space-y-2">
      <div className="flex justify-center gap-3">
        {[0, 1, 2, 3].map((index) => (
          <Input
            key={index}
            id={`pin-${index}`}
            type={showValue ? "text" : "password"}
            inputMode="numeric"
            maxLength={1}
            value={value[index] || ''}
            onChange={(e) => handleChange(index, e.target.value)}
            className="w-12 h-12 text-center text-lg font-bold"
            disabled={disabled}
          />
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-600 text-center flex items-center justify-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  )
}

// Форма присоединения к комнате
function JoinRoomForm({ onSubmit, loading = false, error }: {
  onSubmit: (data: JoinRoomData) => void
  loading?: boolean
  error?: string | null
}) {
  const [username, setUsername] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [partnerUsername, setPartnerUsername] = useState('')
  const [showPinCode, setShowPinCode] = useState(false)
  const [errors, setErrors] = useState<{username?: string, pinCode?: string}>({})

  const validateForm = () => {
    const newErrors: {username?: string, pinCode?: string} = {}
    
    if (username.length < 2) {
      newErrors.username = 'Минимум 2 символа'
    } else if (username.length > 20) {
      newErrors.username = 'Максимум 20 символов'
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      newErrors.username = 'Только буквы, цифры, _ и -'
    }

    if (pinCode.length !== 4) {
      newErrors.pinCode = 'PIN должен состоять из 4 цифр'
    } else if (!/^\d{4}$/.test(pinCode)) {
      newErrors.pinCode = 'Только цифры'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit({ username, pinCode, partnerUsername: partnerUsername || undefined })
    }
  }

  const isValid = username.length >= 2 && pinCode.length === 4

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Присоединиться к комнате</CardTitle>
        <CardDescription>
          Введите ваше имя и PIN-код комнаты
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Имя пользователя */}
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium">
              Ваше имя
            </label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите имя пользователя"
              maxLength={20}
              className={errors.username ? "border-red-500" : ""}
              onKeyDown={(e) => e.key === 'Enter' && isValid && handleSubmit()}
            />
            {errors.username && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.username}
              </p>
            )}
          </div>

          <Separator />

          {/* PIN-код */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">
                PIN-код комнаты
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPinCode(!showPinCode)}
                className="text-xs"
              >
                {showPinCode ? (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" />
                    Скрыть
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 mr-1" />
                    Показать
                  </>
                )}
              </Button>
            </div>

            <PinInput
              value={pinCode}
              onChange={setPinCode}
              error={errors.pinCode}
              disabled={loading}
              showValue={showPinCode}
            />
          </div>

          <Separator />

          {/* Дополнительная информация */}
          <div className="space-y-2">
            <label htmlFor="partnerUsername" className="block text-sm font-medium text-gray-700">
              Имя собеседника <span className="text-gray-400">(опционально)</span>
            </label>
            <Input
              id="partnerUsername"
              value={partnerUsername}
              onChange={(e) => setPartnerUsername(e.target.value)}
              placeholder="Если знаете имя собеседника"
              maxLength={20}
              onKeyDown={(e) => e.key === 'Enter' && isValid && handleSubmit()}
            />
            <p className="text-xs text-gray-500">
              Поможет убедиться, что вы присоединяетесь к правильной комнате
            </p>
          </div>

          {/* Общая ошибка */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}

          {/* Кнопка отправки */}
          <Button 
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Подключение...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Присоединиться к комнате
              </>
            )}
          </Button>
        </div>

        {/* Предварительный просмотр */}
        {username && pinCode.length === 4 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Информация для подключения:
            </h3>
            <div className="space-y-1 text-sm text-blue-700">
              <div className="flex items-center gap-2">
                <span className="font-medium">Имя:</span>
                <span>{username}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">PIN:</span>
                <span className="font-mono">
                  {showPinCode ? pinCode : '••••'}
                </span>
              </div>
              {partnerUsername && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Ожидается:</span>
                  <span>{partnerUsername}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Подсказки по безопасности */}
        <div className="bg-gray-50 rounded-lg p-4 mt-4">
          <div className="flex items-start gap-2">
            <KeyRound className="w-4 h-4 text-gray-600 mt-0.5" />
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-medium">Безопасность:</p>
              <ul className="text-xs space-y-0.5 ml-2">
                <li>• PIN-код предоставляется создателем комнаты</li>
                <li>• Все сообщения зашифрованы end-to-end</li>
                <li>• Комната автоматически удаляется после сессии</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Форма создания комнаты
function CreateRoomForm({ onSubmit, loading = false, error }: {
  onSubmit: (data: { username: string, pinCode: string }) => void
  loading?: boolean
  error?: string | null
}) {
  const [username, setUsername] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [showPinCode, setShowPinCode] = useState(false)
  const [errors, setErrors] = useState<{username?: string, pinCode?: string}>({})



  const validateForm = () => {
    const newErrors: {username?: string, pinCode?: string} = {}
    
    if (username.length < 2) {
      newErrors.username = 'Минимум 2 символа'
    } else if (username.length > 20) {
      newErrors.username = 'Максимум 20 символов'
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      newErrors.username = 'Только буквы, цифры, _ и -'
    }

    if (pinCode.length !== 4) {
      newErrors.pinCode = 'PIN должен состоять из 4 цифр'
    } else if (!/^\d{4}$/.test(pinCode)) {
      newErrors.pinCode = 'Только цифры'
    } else if (pinCode === '0000') {
      newErrors.pinCode = 'PIN не может быть 0000'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit({ username, pinCode })
    }
  }

  const isValid = username.length >= 2 && pinCode.length === 4

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-green-600" />
        </div>
        <CardTitle className="text-2xl">Создать комнату</CardTitle>
        <CardDescription>
          Создайте приватную комнату с вашим PIN-кодом
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Имя пользователя */}
          <div className="space-y-2">
            <label htmlFor="create-username" className="block text-sm font-medium">
              Ваше имя
            </label>
            <Input
              id="create-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите имя пользователя"
              maxLength={20}
              className={errors.username ? "border-red-500" : ""}
              onKeyDown={(e) => e.key === 'Enter' && isValid && handleSubmit()}
            />
            {errors.username && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.username}
              </p>
            )}
          </div>

          <Separator />

          {/* PIN-код */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">
                PIN-код для комнаты
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPinCode(!showPinCode)}
                className="text-xs"
              >
                {showPinCode ? (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" />
                    Скрыть
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 mr-1" />
                    Показать
                  </>
                )}
              </Button>
            </div>

            <PinInput
              value={pinCode}
              onChange={setPinCode}
              error={errors.pinCode}
              disabled={loading}
              showValue={showPinCode}
            />

            <p className="text-xs text-gray-500 text-center">
              Поделитесь этим PIN-кодом с людьми, которых хотите пригласить
            </p>
          </div>

          {/* Общая ошибка */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}

          {/* Кнопка отправки */}
          <Button 
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Создание комнаты...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Создать комнату
              </>
            )}
          </Button>
        </div>

        {/* Предварительный просмотр */}
        {username && pinCode.length === 4 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
            <h3 className="text-sm font-medium text-green-900 mb-2">
              Информация о комнате:
            </h3>
            <div className="space-y-1 text-sm text-green-700">
              <div className="flex items-center gap-2">
                <span className="font-medium">Создатель:</span>
                <span>{username}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">PIN:</span>
                <span className="font-mono">
                  {showPinCode ? pinCode : '••••'}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Главная страница
export default function HomePage() {
  const router = useRouter()
  const [currentView, setCurrentView] = useState<'welcome' | 'create' | 'join'>('welcome')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Создание комнаты
  const handleCreateRoom = async (data: { username: string, pinCode: string }) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Здесь будет API вызов для создания комнаты
      console.log('Creating room:', data)
      
      // Симуляция создания комнаты
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Переход в чат
      router.push(`/chat/room_${data.pinCode}?user=${data.username}&role=creator`)
    } catch (err) {
      setError('Ошибка создания комнаты')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Присоединение к комнате
  const handleJoinRoom = async (data: JoinRoomData) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Здесь будет API вызов для присоединения к комнате
      console.log('Joining room:', data)
      
      // Симуляция присоединения к комнате
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Переход в чат
      router.push(`/chat/room_${data.pinCode}?user=${data.username}&role=participant`)
    } catch (err) {
      setError('Ошибка подключения к комнате')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="font-bold text-xl">Act Talk Matrix</h1>
              <Badge variant="default">✅ Этап 5: Исправленные формы</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">E2E Encrypted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="py-8">
        <div className="max-w-2xl mx-auto px-4">
          
          {/* Welcome Screen */}
          {currentView === 'welcome' && (
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Welcome to Act Talk
                </h2>
                <p className="text-lg text-gray-600 max-w-md mx-auto">
                  Безопасное временное общение с end-to-end шифрованием
                </p>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">End-to-End шифрование</h3>
                  <p className="text-sm text-gray-600">Matrix протокол безопасности</p>
                </div>
                
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Временные комнаты</h3>
                  <p className="text-sm text-gray-600">Автоудаление после сессии</p>
                </div>
                
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <UserCheck className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Анонимность</h3>
                  <p className="text-sm text-gray-600">Без регистрации</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <Button 
                  onClick={() => setCurrentView('create')}
                  size="lg"
                  className="w-full max-w-sm mx-auto block"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Создать комнату
                </Button>
                
                <Button 
                  onClick={() => setCurrentView('join')}
                  variant="outline"
                  size="lg"
                  className="w-full max-w-sm mx-auto block"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Присоединиться к комнате
                </Button>
              </div>
            </div>
          )}

          {/* Create Room Form */}
          {currentView === 'create' && (
            <div className="space-y-4">
              <Button 
                variant="ghost" 
                onClick={() => setCurrentView('welcome')}
                className="mb-4"
              >
                ← Назад
              </Button>
              <CreateRoomForm 
                onSubmit={handleCreateRoom}
                loading={isLoading}
                error={error}
              />
            </div>
          )}

          {/* Join Room Form */}
          {currentView === 'join' && (
            <div className="space-y-4">
              <Button 
                variant="ghost" 
                onClick={() => setCurrentView('welcome')}
                className="mb-4"
              >
                ← Назад
              </Button>
              <JoinRoomForm 
                onSubmit={handleJoinRoom}
                loading={isLoading}
                error={error}
              />
            </div>
          )}
          
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>Act Talk Matrix • Этап 5 • Backend Integration coming soon!</p>
            <p className="mt-1">🔒 Powered by Matrix Protocol</p>
          </div>
        </div>
      </footer>
    </div>
  )
}