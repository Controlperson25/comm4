// src/hooks/useToast.ts
import { useCallback } from 'react'
import { useUIStore } from '@/store/uiStore'

export interface ToastOptions {
  title?: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  persistent?: boolean
}

export function useToast() {
  const { addToast } = useUIStore()

  // Success toast
  const success = useCallback(
    (message: string, options?: Omit<ToastOptions, 'message' | 'type'>) => {
      addToast({
        type: 'success',
        message,
        duration: 4000,
        ...options
      })
    },
    [addToast]
  )

  // Error toast
  const error = useCallback(
    (message: string, options?: Omit<ToastOptions, 'message' | 'type'>) => {
      addToast({
        type: 'error',
        message,
        duration: 6000,
        ...options
      })
    },
    [addToast]
  )

  // Warning toast
  const warning = useCallback(
    (message: string, options?: Omit<ToastOptions, 'message' | 'type'>) => {
      addToast({
        type: 'warning',
        message,
        duration: 5000,
        ...options
      })
    },
    [addToast]
  )

  // Info toast
  const info = useCallback(
    (message: string, options?: Omit<ToastOptions, 'message' | 'type'>) => {
      addToast({
        type: 'info',
        message,
        duration: 4000,
        ...options
      })
    },
    [addToast]
  )

  // Generic toast
  const toast = useCallback(
    (options: ToastOptions) => {
      addToast({
        type: 'info',
        duration: 4000,
        ...options
      })
    },
    [addToast]
  )

  // Promise toast - shows loading, then success/error
  const promise = useCallback(
    async <T>(
      promise: Promise<T>,
      options: {
        loading: string
        success: string | ((data: T) => string)
        error: string | ((error: any) => string)
        duration?: number
      }
    ): Promise<T> => {
      // Show loading toast
      const loadingToast = {
        type: 'info' as const,
        message: options.loading,
        duration: 0, // Persistent until resolved
        title: 'Загрузка...'
      }
      
      addToast(loadingToast)

      try {
        const result = await promise
        
        // Show success toast
        const successMessage = typeof options.success === 'function' 
          ? options.success(result)
          : options.success
          
        success(successMessage, { duration: options.duration })
        
        return result
      } catch (err) {
        // Show error toast
        const errorMessage = typeof options.error === 'function'
          ? options.error(err)
          : options.error
          
        error(errorMessage, { duration: options.duration })
        
        throw err
      }
    },
    [addToast, success, error]
  )

  // Connection status toasts
  const connectionStatus = useCallback(
    (status: 'connected' | 'disconnected' | 'error' | 'reconnecting') => {
      switch (status) {
        case 'connected':
          success('Подключение восстановлено', { duration: 3000 })
          break
        case 'disconnected':
          warning('Соединение потеряно', { 
            duration: 0,
            action: {
              label: 'Переподключиться',
              onClick: () => window.location.reload()
            }
          })
          break
        case 'error':
          error('Ошибка подключения', {
            duration: 0,
            action: {
              label: 'Попробовать снова',
              onClick: () => window.location.reload()
            }
          })
          break
        case 'reconnecting':
          info('Переподключение...', { duration: 3000 })
          break
      }
    },
    [success, warning, error, info]
  )

  // Specialized toasts for common scenarios
  const roomCreated = useCallback(
    (roomName: string) => {
      success(`Комната "${roomName}" создана`, {
        title: 'Успех!',
        duration: 4000
      })
    },
    [success]
  )

  const roomJoined = useCallback(
    (roomName: string) => {
      success(`Присоединились к комнате "${roomName}"`, {
        title: 'Добро пожаловать!',
        duration: 4000
      })
    },
    [success]
  )

  const messageSent = useCallback(
    () => {
      // Usually don't show toast for every message, but can be useful for debugging
      success('Сообщение отправлено', { duration: 2000 })
    },
    [success]
  )

  const fileUploaded = useCallback(
    (fileName: string) => {
      success(`Файл "${fileName}" загружен`, {
        title: 'Загрузка завершена',
        duration: 4000
      })
    },
    [success]
  )

  const sessionExpiring = useCallback(
    (timeLeft: string) => {
      warning(`Сессия закончится через ${timeLeft}`, {
        title: 'Предупреждение',
        duration: 0,
        action: {
          label: 'Продлить',
          onClick: () => {
            // Handle session extension
            info('Сессия продлена', { duration: 3000 })
          }
        }
      })
    },
    [warning, info]
  )

  const sessionExpired = useCallback(
    () => {
      error('Сессия истекла', {
        title: 'Время вышло',
        duration: 0,
        action: {
          label: 'Создать новую комнату',
          onClick: () => {
            window.location.href = '/'
          }
        }
      })
    },
    [error]
  )

  const userJoined = useCallback(
    (username: string) => {
      info(`${username} присоединился к чату`, {
        duration: 3000
      })
    },
    [info]
  )

  const userLeft = useCallback(
    (username: string) => {
      info(`${username} покинул чат`, {
        duration: 3000
      })
    },
    [info]
  )

  const encryptionEnabled = useCallback(
    () => {
      success('End-to-end шифрование включено', {
        title: 'Безопасность',
        duration: 4000
      })
    },
    [success]
  )

  const matrixConnected = useCallback(
    () => {
      success('Подключено к Matrix', {
        title: 'Matrix Protocol',
        duration: 3000
      })
    },
    [success]
  )

  const matrixError = useCallback(
    (message: string) => {
      error(`Matrix: ${message}`, {
        title: 'Ошибка Matrix',
        duration: 6000
      })
    },
    [error]
  )

  return {
    // Basic toast methods
    toast,
    success,
    error,
    warning,
    info,
    promise,
    
    // Connection status
    connectionStatus,
    
    // Specialized toasts
    roomCreated,
    roomJoined,
    messageSent,
    fileUploaded,
    sessionExpiring,
    sessionExpired,
    userJoined,
    userLeft,
    encryptionEnabled,
    matrixConnected,
    matrixError
  }
}

// Hook for managing toast notifications with keyboard shortcuts
export function useToastKeyboard() {
  const toast = useToast()

  // Copy to clipboard with toast feedback
  const copyToClipboard = useCallback(
    async (text: string, message = 'Скопировано в буфер обмена') => {
      try {
        await navigator.clipboard.writeText(text)
        toast.success(message)
      } catch (err) {
        toast.error('Не удалось скопировать')
      }
    },
    [toast]
  )

  // Show keyboard shortcut help
  const showKeyboardHelp = useCallback(
    () => {
      toast.info('Нажмите Ctrl+K для быстрых действий', {
        title: 'Подсказка',
        duration: 4000
      })
    },
    [toast]
  )

  return {
    ...toast,
    copyToClipboard,
    showKeyboardHelp
  }
}