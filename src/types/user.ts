// types/user.ts
export interface User {
  id: string
  username: string
  matrixUserId?: string
  createdAt: Date
  sessionId?: string
  isOnline?: boolean
}

export interface UserState {
  currentUser: User | null
  currentStep: number
  isAuthenticated: boolean
  sessionStartTime: Date | null
  error: string | null
  isLoading: boolean
}

export interface StepData {
  step: number
  title: string
  subtitle: string
  completed: boolean
  canGoBack: boolean
  canGoNext: boolean
}

export interface CreateUserData {
  username: string
}

export interface JoinRoomData {
  username: string
  pinCode: string
}

export interface CreateRoomData {
  username: string
  pinCode: string
  roomName?: string
}

export interface SessionData {
  userId: string
  username: string
  roomId?: string
  startTime: Date
  expiresAt: Date
  isActive: boolean
}

// Типы для форм
export interface UsernameFormData {
  username: string
}

export interface PinCodeFormData {
  pinCode: string
}

export interface JoinRoomFormData {
  username: string
  pinCode: string
}

// Типы для локального хранения
export interface StoredUserData {
  username: string
  sessionId: string
  lastActivity: string
}

// Типы для Matrix интеграции
export interface MatrixUserData {
  userId: string
  deviceId: string
  accessToken: string
  homeserverUrl: string
}