// src/lib/api/rooms.ts
import { apiClient } from './client'
import type { 
  CreateRoomRequest, 
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  RoomResponse,
  LeaveRoomRequest
} from '@/types/api'

export class RoomsAPI {
  /**
   * Создать новую комнату
   */
  async createRoom(data: CreateRoomRequest): Promise<CreateRoomResponse> {
    const response = await apiClient.post<{ success: boolean; data: CreateRoomResponse }>(
      '/api/rooms',
      data
    )
    
    if (!response.success) {
      throw new Error(response.data?.error || 'Ошибка создания комнаты')
    }
    
    return response.data
  }
  
  /**
   * Присоединиться к комнате по PIN-коду
   */
  async joinRoomByPin(data: JoinRoomRequest): Promise<JoinRoomResponse> {
    const response = await apiClient.post<{ success: boolean; data: JoinRoomResponse }>(
      '/api/rooms/join',
      {
        pinCode: data.pinCode,
        username: data.username
      }
    )
    
    if (!response.success) {
      throw new Error(response.data?.error || 'Ошибка присоединения к комнате')
    }
    
    return response.data
  }
  
  /**
   * Присоединиться к комнате по ID
   */
  async joinRoomById(roomId: string, data: JoinRoomRequest): Promise<JoinRoomResponse> {
    const response = await apiClient.post<{ success: boolean; data: JoinRoomResponse }>(
      `/api/rooms/${roomId}`,
      {
        action: 'join',
        pinCode: data.pinCode,
        username: data.username
      }
    )
    
    if (!response.success) {
      throw new Error(response.data?.error || 'Ошибка присоединения к комнате')
    }
    
    return response.data
  }
  
  /**
   * Получить информацию о комнате
   */
  async getRoomInfo(roomId: string): Promise<RoomResponse> {
    const response = await apiClient.get<{ success: boolean; data: RoomResponse }>(
      `/api/rooms/${roomId}`
    )
    
    if (!response.success) {
      throw new Error(response.data?.error || 'Комната не найдена')
    }
    
    return response.data
  }
  
  /**
   * Покинуть комнату
   */
  async leaveRoom(roomId: string, username: string): Promise<void> {
    const response = await apiClient.post<{ success: boolean }>(
      `/api/rooms/${roomId}`,
      {
        action: 'leave',
        username
      }
    )
    
    if (!response.success) {
      throw new Error('Ошибка выхода из комнаты')
    }
  }
  
  /**
   * Обновить информацию о комнате (только для создателя)
   */
  async updateRoom(roomId: string, updates: {
    name?: string
    maxParticipants?: number
  }): Promise<RoomResponse> {
    const response = await apiClient.put<{ success: boolean; data: RoomResponse }>(
      `/api/rooms/${roomId}`,
      updates
    )
    
    if (!response.success) {
      throw new Error('Ошибка обновления комнаты')
    }
    
    return response.data
  }
  
  /**
   * Удалить комнату (только для создателя)
   */
  async deleteRoom(roomId: string): Promise<void> {
    const response = await apiClient.delete<{ success: boolean }>(
      `/api/rooms/${roomId}`
    )
    
    if (!response.success) {
      throw new Error('Ошибка удаления комнаты')
    }
  }
  
  /**
   * Получить список активных комнат (для отладки)
   */
  async getActiveRooms(): Promise<Array<{
    id: string
    name: string
    participantCount: number
    createdAt: string
    expiresAt: string
  }>> {
    const response = await apiClient.get<{ 
      success: boolean; 
      data: { 
        rooms: Array<any>; 
        stats: any 
      } 
    }>('/api/rooms')
    
    if (!response.success) {
      throw new Error('Ошибка получения списка комнат')
    }
    
    return response.data.rooms
  }
  
  /**
   * Проверить доступность PIN-кода
   */
  async checkPinAvailability(pinCode: string): Promise<boolean> {
    try {
      await this.getRoomByPin(pinCode)
      return false // PIN занят
    } catch {
      return true // PIN свободен
    }
  }
  
  /**
   * Найти комнату по PIN-коду
   */
  private async getRoomByPin(pinCode: string): Promise<any> {
    const rooms = await this.getActiveRooms()
    const room = rooms.find(r => r.pinCode === pinCode)
    
    if (!room) {
      throw new Error('Комната с таким PIN не найдена')
    }
    
    return room
  }
}

// Singleton экземпляр
export const roomsAPI = new RoomsAPI()