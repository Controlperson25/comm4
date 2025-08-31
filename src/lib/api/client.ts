// src/lib/api/client.ts
import type { ApiResponse, ApiError } from '@/types/api'

interface RequestConfig extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
}

interface ApiClientConfig {
  baseUrl?: string
  timeout?: number
  retries?: number
  retryDelay?: number
  defaultHeaders?: Record<string, string>
}

export class ApiClient {
  private baseUrl: string
  private timeout: number
  private retries: number
  private retryDelay: number
  private defaultHeaders: Record<string, string>
  
  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    this.timeout = config.timeout || 10000 // 10 seconds
    this.retries = config.retries || 3
    this.retryDelay = config.retryDelay || 1000 // 1 second
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.defaultHeaders
    }
  }
  
  /**
   * Основной метод для HTTP запросов
   */
  private async request<T = any>(
    endpoint: string, 
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      timeout = this.timeout,
      retries = this.retries,
      retryDelay = this.retryDelay,
      headers = {},
      ...requestConfig
    } = config
    
    const url = `${this.baseUrl}${endpoint}`
    const requestHeaders = { ...this.defaultHeaders, ...headers }
    
    // Создаем AbortController для timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...requestConfig,
          headers: requestHeaders,
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        // Обработка HTTP ошибок
        if (!response.ok) {
          let errorData: any = {}
          
          try {
            errorData = await response.json()
          } catch {
            errorData = { 
              error: `HTTP ${response.status}: ${response.statusText}`,
              statusCode: response.status
            }
          }
          
          const apiError: ApiError = {
            message: errorData.error || errorData.message || 'Ошибка API',
            code: errorData.code || 'API_ERROR',
            statusCode: response.status,
            details: errorData.details,
            timestamp: new Date().toISOString()
          }
          
          throw apiError
        }
        
        // Успешный ответ
        const data = await response.json()
        return data
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Неизвестная ошибка')
        
        // Если это последняя попытка или ошибка не требует повтора
        if (attempt === retries || !this.shouldRetry(error)) {
          break
        }
        
        // Ждем перед повторной попыткой
        await this.delay(retryDelay * Math.pow(2, attempt)) // Exponential backoff
      }
    }
    
    clearTimeout(timeoutId)
    throw lastError
  }
  
  /**
   * Определяет, нужно ли повторить запрос
   */
  private shouldRetry(error: any): boolean {
    // Не повторяем для клиентских ошибок (4xx)
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return false
    }
    
    // Повторяем для сетевых ошибок и серверных ошибок (5xx)
    return error.name === 'AbortError' || 
           error.name === 'TypeError' || 
           (error.statusCode >= 500)
  }
  
  /**
   * Задержка
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  // ==================== HTTP METHODS ====================
  
  async get<T = any>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' })
  }
  
  async post<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    const body = data instanceof FormData ? data : JSON.stringify(data)
    const headers = data instanceof FormData ? {} : this.defaultHeaders
    
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body,
      headers: { ...headers, ...config?.headers }
    })
  }
  
  async put<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }
  
  async patch<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  }
  
  async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }
  
  // ==================== UTILITY METHODS ====================
  
  /**
   * Проверка здоровья API
   */
  async healthCheck(): Promise<any> {
    return this.get('/api/health')
  }
  
  /**
   * Обновление базового URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url
  }
  
  /**
   * Добавление заголовка по умолчанию
   */
  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value
  }
  
  /**
   * Удаление заголовка по умолчанию
   */
  removeDefaultHeader(key: string): void {
    delete this.defaultHeaders[key]
  }
}

// Singleton экземпляр
export const apiClient = new ApiClient()

// Хуки для интеграции с React
export function useApiClient() {
  return apiClient
}

// Обработчик ошибок для React компонентов
export function handleApiError(error: any): { message: string; code?: string } {
  if (error && typeof error === 'object') {
    return {
      message: error.message || 'Ошибка API',
      code: error.code
    }
  }
  
  return {
    message: 'Неизвестная ошибка'
  }
}