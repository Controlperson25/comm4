// src/lib/api/messages.ts
import { apiClient } from './client'
import type { 
  SendMessageRequest,
  SendMessageResponse,
  GetMessagesRequest,
  GetMessagesResponse,
  UploadFileRequest,
  UploadFileResponse,
  MessageResponse
} from '@/types/api'

export class MessagesAPI {
  /**
   * Отправить текстовое сообщение
   */
  async sendMessage(data: SendMessageRequest): Promise<MessageResponse> {
    const response = await apiClient.post<{ success: boolean; data: MessageResponse }>(
      `/api/rooms/${data.roomId}/messages`,
      {
        content: data.content,
        senderId: data.sessionId, // Используем sessionId как senderId для простоты
        senderName: this.extractUsernameFromSession(data.sessionId),
        type: data.type || 'text'
      }
    )
    
    if (!response.success) {
      throw new Error(response.data?.error || 'Ошибка отправки сообщения')
    }
    
    return response.data
  }
  
  /**
   * Получить сообщения комнаты
   */
  async getMessages(data: GetMessagesRequest): Promise<GetMessagesResponse> {
    const params = new URLSearchParams()
    if (data.page) params.append('page', data.page.toString())
    if (data.limit) params.append('limit', data.limit.toString())
    if (data.before) params.append('before', data.before)
    
    const response = await apiClient.get<GetMessagesResponse>(
      `/api/rooms/${data.roomId}/messages?${params.toString()}`
    )
    
    if (!response.success) {
      throw new Error('Ошибка получения сообщений')
    }
    
    return response
  }
  
  /**
   * Загрузить изображение
   */
  async uploadImage(data: UploadFileRequest): Promise<UploadFileResponse> {
    // Валидация файла
    this.validateImageFile(data.file)
    
    const formData = new FormData()
    formData.append('image', data.file)
    formData.append('senderId', data.sessionId)
    formData.append('senderName', this.extractUsernameFromSession(data.sessionId))
    if (data.description) {
      formData.append('description', data.description)
    }
    
    const response = await apiClient.post<{ success: boolean; data: UploadFileResponse }>(
      `/api/rooms/${data.roomId}/upload`,
      formData,
      {
        headers: {}, // Убираем Content-Type для FormData
        timeout: 30000 // Увеличиваем timeout для загрузки файлов
      }
    )
    
    if (!response.success) {
      throw new Error(response.data?.error || 'Ошибка загрузки изображения')
    }
    
    return response.data
  }
  
  /**
   * Отправить изображение как сообщение
   */
  async sendImage(roomId: string, file: File, sessionId: string, description?: string): Promise<MessageResponse> {
    try {
      const uploadResult = await this.uploadImage({
        roomId,
        file,
        sessionId,
        description
      })
      
      // Отправить сообщение с изображением
      return this.sendMessage({
        roomId,
        content: description || `Изображение: ${file.name}`,
        type: 'image',
        sessionId
      })
      
    } catch (error) {
      throw new Error('Ошибка отправки изображения')
    }
  }
  
  /**
   * Отметить сообщения как прочитанные
   */
  async markAsRead(roomId: string, messageIds: string[], sessionId: string): Promise<void> {
    // В будущем реализуем read receipts
    console.log('Marking messages as read:', { roomId, messageIds, sessionId })
  }
  
  /**
   * Поиск сообщений в комнате
   */
  async searchMessages(roomId: string, query: string, sessionId: string): Promise<{
    messages: Array<any>
    total: number
  }> {
    const allMessages = await this.getMessages({
      roomId,
      sessionId,
      limit: 1000 // Получаем все сообщения для поиска
    })
    
    if (!allMessages.data) {
      return { messages: [], total: 0 }
    }
    
    // Простой поиск по содержимому
    const filteredMessages = allMessages.data.filter(message => 
      message.content.toLowerCase().includes(query.toLowerCase())
    )
    
    return {
      messages: filteredMessages,
      total: filteredMessages.length
    }
  }
  
  /**
   * Валидация изображения
   */
  private validateImageFile(file: File): void {
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    
    if (file.size > maxSize) {
      throw new Error('Файл слишком большой. Максимальный размер: 5MB')
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Неподдерживаемый тип файла. Разрешены: JPEG, PNG, GIF, WebP')
    }
    
    if (file.name.length > 255) {
      throw new Error('Имя файла слишком длинное')
    }
  }
  
  /**
   * Извлечь имя пользователя из sessionId (временное решение)
   */
  private extractUsernameFromSession(sessionId: string): string {
    // В реальном приложении это будет браться из JWT или базы данных
    // Пока что возвращаем заглушку
    return 'Пользователь'
  }
  
  /**
   * Получить статистику сообщений
   */
  async getMessageStats(roomId: string, sessionId: string): Promise<{
    totalMessages: number
    messagesPerHour: number
    mostActiveUser: string
    mediaMessages: number
  }> {
    try {
      const messagesResult = await this.getMessages({
        roomId,
        sessionId,
        limit: 1000
      })
      
      if (!messagesResult.data) {
        return {
          totalMessages: 0,
          messagesPerHour: 0,
          mostActiveUser: '',
          mediaMessages: 0
        }
      }
      
      const messages = messagesResult.data
      const userCounts: Record<string, number> = {}
      let mediaCount = 0
      
      messages.forEach(msg => {
        userCounts[msg.senderName] = (userCounts[msg.senderName] || 0) + 1
        if (msg.type === 'image') mediaCount++
      })
      
      const mostActiveUser = Object.entries(userCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || ''
      
      // Вычисляем сообщений в час (примерно)
      const timeSpan = messages.length > 1 ? 
        new Date(messages[messages.length - 1].timestamp).getTime() - 
        new Date(messages[0].timestamp).getTime() : 0
      const hours = timeSpan / (1000 * 60 * 60)
      const messagesPerHour = hours > 0 ? Math.round(messages.length / hours) : 0
      
      return {
        totalMessages: messages.length,
        messagesPerHour,
        mostActiveUser,
        mediaMessages: mediaCount
      }
    } catch (error) {
      return {
        totalMessages: 0,
        messagesPerHour: 0,
        mostActiveUser: '',
        mediaMessages: 0
      }
    }
  }
}

// Singleton экземпляр
export const messagesAPI = new MessagesAPI()