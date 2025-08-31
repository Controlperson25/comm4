// src/components/forms/UsernameForm.tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { usernameSchema, type UsernameFormData } from "@/lib/validation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { User, Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface UsernameFormProps {
  onSubmit: (data: UsernameFormData) => void | Promise<void>
  loading?: boolean
  error?: string | null
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

export function UsernameForm({ 
  onSubmit, 
  loading = false,
  error,
  placeholder = "Введите имя пользователя",
  autoFocus = true,
  className 
}: UsernameFormProps) {
  const [isChecking, setIsChecking] = useState(false)
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isValid, dirtyFields },
    watch,
    setError: setFormError
  } = useForm<UsernameFormData>({
    resolver: zodResolver(usernameSchema),
    mode: 'onChange'
  })

  const usernameValue = watch('username')
  const hasValidUsername = isValid && dirtyFields.username

  const handleFormSubmit = async (data: UsernameFormData) => {
    setIsChecking(true)
    try {
      await onSubmit(data)
    } catch (err) {
      setFormError('username', { 
        message: 'Это имя уже занято. Попробуйте другое.' 
      })
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Заголовок */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">
          Выберите имя пользователя
        </h2>
        <p className="text-gray-600">
          Это имя будет видно другим участникам чата
        </p>
      </div>

      {/* Форма */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Имя пользователя
          </label>
          
          <div className="relative">
            <Input
              id="username"
              {...register('username')}
              placeholder={placeholder}
              autoFocus={autoFocus}
              maxLength={20}
              className={cn(
                "pr-10",
                errors.username && "border-red-500 focus-visible:ring-red-500",
                hasValidUsername && "border-green-500 focus-visible:ring-green-500"
              )}
            />
            
            {/* Индикатор состояния */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {isChecking ? (
                <LoadingSpinner size="sm" />
              ) : hasValidUsername ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : errors.username ? (
                <AlertCircle className="w-4 h-4 text-red-500" />
              ) : null}
            </div>
          </div>
          
          {/* Ошибки валидации */}
          {errors.username && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.username.message}
            </p>
          )}
          
          {/* Общая ошибка */}
          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          )}
          
          {/* Подсказки */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• От 2 до 20 символов</p>
            <p>• Только буквы, цифры, _ и -</p>
            <p>• Не может начинаться или заканчиваться на _</p>
          </div>
        </div>

        {/* Кнопка отправки */}
        <Button 
          type="submit" 
          disabled={!isValid || loading || isChecking}
          className="w-full"
          size="lg"
        >
          {loading || isChecking ? (
            <>
              <LoadingSpinner size="sm" />
              Проверка...
            </>
          ) : (
            'Продолжить'
          )}
        </Button>
      </form>

      {/* Предварительный просмотр */}
      {usernameValue && !errors.username && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Предварительный просмотр:</p>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-medium">
                {usernameValue.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="font-medium">{usernameValue}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Компактная версия для использования в других местах
export function UsernameInput({ 
  value, 
  onChange, 
  error,
  ...props 
}: {
  value: string
  onChange: (value: string) => void
  error?: string
} & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'>) {
  return (
    <div className="space-y-2">
      <Input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(error && "border-red-500")}
        maxLength={20}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}