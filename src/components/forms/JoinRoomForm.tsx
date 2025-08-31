// src/components/forms/JoinRoomForm.tsx
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { joinRoomSchema, type JoinRoomFormData } from "@/lib/validation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { PinInput } from "./PinCodeForm"
import { UsersRound, KeyRound, AlertCircle, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface JoinRoomFormProps {
  onSubmit: (data: JoinRoomFormData) => void | Promise<void>
  loading?: boolean
  error?: string | null
  initialUsername?: string
  className?: string
}

export function JoinRoomForm({ 
  onSubmit, 
  loading = false,
  error,
  initialUsername = '',
  className 
}: JoinRoomFormProps) {
  const [showPinCode, setShowPinCode] = useState(false)
  const [currentStep, setCurrentStep] = useState<'username' | 'pin' | 'both'>('both')
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isValid },
    watch,
    setValue,
    getValues
  } = useForm<JoinRoomFormData>({
    resolver: zodResolver(joinRoomSchema),
    mode: 'onChange',
    defaultValues: {
      username: initialUsername
    }
  })

  const watchedValues = watch()

  const handleFormSubmit = async (data: JoinRoomFormData) => {
    try {
      await onSubmit(data)
    } catch (err) {
      // Ошибка обрабатывается через props
    }
  }

  const handlePinChange = (pinValue: string) => {
    setValue('pinCode', pinValue, { shouldValidate: true })
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Заголовок */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <UsersRound className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">
          Присоединиться к комнате
        </h2>
        <p className="text-gray-600">
          Введите ваше имя и PIN-код комнаты
        </p>
      </div>

      {/* Форма */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        
        {/* Имя пользователя */}
        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Ваше имя
          </label>
          <Input
            id="username"
            {...register('username')}
            placeholder="Введите имя пользователя"
            maxLength={20}
            className={cn(
              errors.username && "border-red-500 focus-visible:ring-red-500"
            )}
          />
          {errors.username && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.username.message}
            </p>
          )}
        </div>

        <Separator />

        {/* PIN-код */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
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
            value={watchedValues.pinCode || ''}
            onChange={handlePinChange}
            error={errors.pinCode?.message}
            disabled={loading}
          />

          {errors.pinCode && (
            <p className="text-sm text-red-600 flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.pinCode.message}
            </p>
          )}
        </div>

        <Separator />

        {/* Дополнительная информация (опционально) */}
        <div className="space-y-2">
          <label htmlFor="partnerUsername" className="block text-sm font-medium text-gray-700">
            Имя собеседника <span className="text-gray-400">(опционально)</span>
          </label>
          <Input
            id="partnerUsername"
            {...register('partnerUsername')}
            placeholder="Если знаете имя собеседника"
            maxLength={20}
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
          type="submit" 
          disabled={!isValid || loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" />
              Подключение...
            </>
          ) : (
            <>
              <UsersRound className="w-4 h-4 mr-2" />
              Присоединиться к комнате
            </>
          )}
        </Button>
      </form>

      {/* Предварительный просмотр */}
      {watchedValues.username && watchedValues.pinCode?.length === 4 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            Информация для подключения:
          </h3>
          <div className="space-y-1 text-sm text-blue-700">
            <div className="flex items-center gap-2">
              <span className="font-medium">Имя:</span>
              <span>{watchedValues.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">PIN:</span>
              <span className="font-mono">
                {showPinCode ? watchedValues.pinCode : '••••'}
              </span>
            </div>
            {watchedValues.partnerUsername && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Ожидается:</span>
                <span>{watchedValues.partnerUsername}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Подсказки по безопасности */}
      <div className="bg-gray-50 rounded-lg p-4">
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
    </div>
  )
}

// Упрощенная версия для быстрого присоединения
export function QuickJoinForm({ 
  onSubmit, 
  loading 
}: {
  onSubmit: (username: string, pinCode: string) => void
  loading?: boolean
}) {
  const [username, setUsername] = useState('')
  const [pinCode, setPinCode] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (username.length >= 2 && pinCode.length === 4) {
      onSubmit(username, pinCode)
    }
  }

  const isValid = username.length >= 2 && pinCode.length === 4

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Ваше имя"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        maxLength={20}
      />
      
      <PinInput
        value={pinCode}
        onChange={setPinCode}
      />
      
      <Button 
        type="submit" 
        disabled={!isValid || loading}
        className="w-full"
      >
        {loading ? <LoadingSpinner size="sm" /> : 'Присоединиться'}
      </Button>
    </form>
  )
}