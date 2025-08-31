// src/lib/api.ts
import type { 
  CreateRoomRequest, 
  CreateRoomResponse,
  JoinRoomRequest, 
  JoinRoomResponse,
  SendMessageRequest,
  SendMessageResponse,
  UploadImageRequest,
  UploadImageResponse,
  ApiResponse,
  ApiError 
} from '@/types/api'
import { ENV_URLS, ROUTES } from '@/constants/routes'
import { ERROR_MESSAGES } from '@/constants/ui'

class ApiClient {
  private baseUrl = ENV_URLS.API_URL
  private accessToken: string | null = null

  // Set access token for authenticated requests
  setAccessToken(token: string | null) {
    this.accessToken = token
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // Add auth token if available
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        return {} as T
      }

      const data = await response.json()

      if (!response.ok) {
        const error = data as ApiError
        throw new Error(error.message || error.error || ERROR_MESSAGES.GENERIC_ERROR)
      }

      // Handle wrapped responses
      if (data.success !== undefined) {
        const apiResponse = data as ApiResponse<T>
        if (!apiResponse.success) {
          throw new Error(apiResponse.message || ERROR_MESSAGES.GENERIC_ERROR)
        }
        return apiResponse.data
      }

      return data
    } catch (error) {
      if (error instanceof Error) {
        // Network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          throw new Error(ERROR_MESSAGES.NETWORK_ERROR)
        }
        throw error
      }
      throw new Error(ERROR_MESSAGES.GENERIC_ERROR)
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request(ROUTES.API_HEALTH)
  }

  // User management
  async createUser(username: string): Promise<{ id: string; username: string }> {
    return this.request(ROUTES.API_USERS, {
      method: 'POST',
      body: JSON.stringify({ username })
    })
  }

  // Room management
  async createRoom(data: CreateRoomRequest): Promise<CreateRoomResponse> {
    const response = await this.request<CreateRoomResponse>(ROUTES.API_ROOMS_CREATE, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    
    // Store access token
    if (response.accessToken) {
      this.setAccessToken(response.accessToken)
    }
    
    return response
  }

  async joinRoom(roomId: string, data: JoinRoomRequest): Promise<JoinRoomResponse> {
    const response = await this.request<JoinRoomResponse>(
      ROUTES.API_ROOMS_JOIN(roomId), 
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    )
    
    // Store access token
    if (response.accessToken) {
      this.setAccessToken(response.accessToken)
    }
    
    return response
  }

  async getRoomMessages(roomId: string, limit = 50, before?: string): Promise<{ messages: any[] }> {
    const params = new URLSearchParams({ limit: limit.toString() })
    if (before) params.append('before', before)
    
    return this.request(`${ROUTES.API_ROOMS_MESSAGES(roomId)}?${params}`)
  }

  // Message management
  async sendMessage(roomId: string, data: SendMessageRequest): Promise<SendMessageResponse> {
    return this.request(ROUTES.API_ROOMS_MESSAGES(roomId), {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // File upload
  async uploadImage(roomId: string, file: File, caption?: string): Promise<UploadImageResponse> {
    const formData = new FormData()
    formData.append('image', file)
    if (caption) {
      formData.append('caption', caption)
    }

    const headers: HeadersInit = {}
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`
    }

    return this.request(ROUTES.API_UPLOAD(roomId), {
      method: 'POST',
      body: formData,
      headers, // Don't set Content-Type for FormData
    })
  }

  // Room status
  async getRoomInfo(roomId: string): Promise<{ room: any; participants: any[] }> {
    return this.request(`${ROUTES.API_ROOMS}/${roomId}`)
  }

  async leaveRoom(roomId: string): Promise<{ success: boolean }> {
    return this.request(`${ROUTES.API_ROOMS}/${roomId}/leave`, {
      method: 'POST'
    })
  }

  // Cleanup
  clearAuth() {
    this.accessToken = null
  }
}

// Export singleton instance
export const api = new ApiClient()

// Export class for testing
export { ApiClient }