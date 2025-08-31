// src/components/forms/PinCodeForm.tsx
import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { pinCodeSchema, type PinCodeFormData } from "@/lib/validation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { KeyRound, Shield, AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface PinCodeFormProps {
  onSubmit: (pin: string) => void | Promise<void>
  loading?: boolean
  error?: string | null
  label?: string
  description?: string
  mode?: 'create' | 'join'
  autoSubmit?: boolean
  showRegenerateButton?: boolean
  onRegenerate?: () => void
  className?: string
}

export function PinCodeForm({ 
  onSubmit, 
  loading = false,
  error,
  label = "Введите PIN-код",
  description = "4-значный код для доступа к комнате",
  mode = 'create',
  autoSubmit = true,
  showRegenerateButton = false,
  onRegenerate,
  className 
}: PinCodeFormProps) {
  const [pin, setPin] = useState(['', '', '', ''])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Сброс PIN при смене режима или ошибке
  useEffect(() => {
    if (error) {
      setPin(['', '', '', ''])
      inputRefs.current[0]?.focus()
    }
  }, [error])

  const handlePinChange = (index: number, value: string) => {
    // Разрешаем только цифры
    if (!/^\d?$/.test(value)) return
    
    const newPin = [...pin]
    newPin[index] = value
    setPin(newPin)
    
    // Автофокус на следующий инпут при вводе
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
    
    // Автоотправка когда PIN заполнен
    if (autoSubmit && newPin.every(digit => digit !== '') && newPin.join('').length === 4) {
      handleSubmit(newPin.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Backspace - переход к предыдущему полю
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    
    // Enter - отправка формы
    if (e.key === 'Enter' && pin.every(digit => digit !== '')) {
      handleSubmit(pin.join(''))
    }
    
    // Стрелки для навигации
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < 3) {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    
    if (pastedData.length === 4) {
      const newPin = pastedData.split('')
      setPin(newPin)
      
      if (autoSubmit) {
        handleSubmit(pastedData)
      }
    }
  }

  const handleSubmit = async (pinValue: string) => {
    if (pinValue.length !== 4 || isSubmitting) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(pinValue)
    } catch (err) {
      // Ошибка обрабатывается через props.error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleManualSubmit = () => {
    const pinValue = pin.join('')
    if (pinValue.length === 4) {
      handleSubmit(pinValue)
    }
  }

  const handleClear = () => {
    setPin(['', '', '', ''])
    inputRefs.current[0]?.focus()
  }

  const isPinComplete = pin.every(digit => digit !== '')
  const isLoading = loading || isSubmitting

  return (
    <div className={cn("space-y-6", className)}>
      {/* Заголовок */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          {mode === 'create' ? (
            <KeyRound className="w-8 h-8 text-primary" />
          ) : (
            <Shield className="w-8 h-8 text-primary" />
          )}
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">
          {label}
        </h2>
        <p className="text-gray-600">
          {description}
        </p>
      </div>

      {/* PIN инпуты */}
      <div className="space-y-4">
        <div className="flex justify-center gap-3">
          {pin.map((digit, index) => (
            <Input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handlePinChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className={cn(
                "w-12 h-12 text-center text-lg font-bold",
                "sm:w-16 sm:h-16 sm:text-xl",
                error && "border-red-500",
                digit && "border-primary"
              )}
              autoFocus={index === 0}
              disabled={isLoading}
            />
          ))}
        </div>

        {/* Индикатор загрузки */}
        {isLoading && (
          <div className="flex justify-center">
            <LoadingSpinner 
              text={mode === 'create' ? "Создание комнаты..." : "Подключение к комнате..."} 
            />
          </div>
        )}

        {/* Ошибка */}
        {error && (
          <div className="text-center">
            <p className="text-sm text-red-600 flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          </div>
        )}

        {/* Подсказка */}
        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>Введите 4 цифры</p>
          {mode === 'create' && (
            <p>PIN-код будет использован для доступа к комнате</p>
          )}
        </div>
      </div>

      {/* Действия */}
      <div className="space-y-3">
        {/* Кнопка отправки (если не автоотправка) */}
        {!autoSubmit && (
          <Button 
            onClick={handleManualSubmit}
            disabled={!isPinComplete || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                {mode === 'create' ? 'Создание...' : 'Подключение...'}
              </>
            ) : (
              mode === 'create' ? 'Создать комнату' : 'Присоединиться'
            )}
          </Button>
        )}

        {/* Дополнительные действия */}
        <div className="flex gap-2 justify-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleClear}
            disabled={isLoading}
          >
            Очистить
          </Button>
          
          {showRegenerateButton && onRegenerate && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onRegenerate}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Новый PIN
            </Button>
          )}
        </div>
      </div>

      {/* Индикатор безопасности */}
      {isPinComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-700">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">
              PIN-код готов к использованию
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Компактная версия PIN инпута
export function PinInput({ 
  value, 
  onChange, 
  error,
  disabled = false
}: {
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}) {
  const [localPin, setLocalPin] = useState(value.split('').slice(0, 4))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setLocalPin(value.split('').slice(0, 4))
  }, [value])

  const handleChange = (index: number, newValue: string) => {
    if (!/^\d?$/.test(newValue)) return
    
    const newPin = [...localPin]
    newPin[index] = newValue
    setLocalPin(newPin)
    onChange(newPin.join(''))
    
    if (newValue && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 justify-center">
        {localPin.map((digit, index) => (
          <Input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(index, e.target.value)}
            className={cn(
              "w-10 h-10 text-center font-bold",
              error && "border-red-500"
            )}
            disabled={disabled}
          />
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  )
}