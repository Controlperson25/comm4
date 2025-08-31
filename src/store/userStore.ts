// src/store/userStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, UserState, StepData, SessionData } from '@/types/user'
import { STEPS } from '@/constants/ui'

interface UserStoreState extends UserState {
  // Step management
  currentStep: number
  stepHistory: number[]
  canGoBack: boolean
  canGoNext: boolean
  stepData: Record<number, StepData>
  
  // Session management
  sessionStartTime: Date | null
  sessionId: string | null
  lastActivity: Date | null
  
  // Form data
  formData: {
    username: string
    pinCode: string
    roomName: string
  }
  
  // Preferences
  preferences: {
    theme: 'light' | 'dark' | 'system'
    notifications: boolean
    sounds: boolean
    language: 'ru' | 'en'
  }
}

interface UserActions {
  // User management
  setUser: (user: User) => void
  updateUser: (updates: Partial<User>) => void
  clearUser: () => void
  setAuthenticated: (authenticated: boolean) => void
  
  // Step management
  nextStep: () => void
  previousStep: () => void
  setStep: (step: number) => void
  resetSteps: () => void
  updateStepData: (step: number, data: Partial<StepData>) => void
  
  // Session management
  startSession: () => void
  endSession: () => void
  setSessionId: (sessionId: string) => void
  updateLastActivity: () => void
  
  // Form data management
  updateFormData: (updates: Partial<UserStoreState['formData']>) => void
  clearFormData: () => void
  
  // State management
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  
  // Preferences
  updatePreferences: (updates: Partial<UserStoreState['preferences']>) => void
  setTheme: (theme: UserStoreState['preferences']['theme']) => void
  
  // General
  reset: () => void
}

type UserStore = UserStoreState & UserActions

const initialState: UserStoreState = {
  // User state
  currentUser: null,
  currentStep: STEPS.USERNAME,
  isAuthenticated: false,
  error: null,
  isLoading: false,
  
  // Step management
  stepHistory: [STEPS.USERNAME],
  canGoBack: false,
  canGoNext: false,
  stepData: {
    [STEPS.USERNAME]: {
      step: STEPS.USERNAME,
      title: 'Добро пожаловать',
      subtitle: 'Выберите имя пользователя',
      completed: false,
      canGoBack: false,
      canGoNext: false
    },
    [STEPS.CREATE_ROOM]: {
      step: STEPS.CREATE_ROOM,
      title: 'Создание комнаты',
      subtitle: 'Создайте PIN-код для комнаты',
      completed: false,
      canGoBack: true,
      canGoNext: false
    },
    [STEPS.JOIN_ROOM]: {
      step: STEPS.JOIN_ROOM,
      title: 'Присоединение',
      subtitle: 'Введите PIN-код комнаты',
      completed: false,
      canGoBack: true,
      canGoNext: false
    },
    [STEPS.CHAT]: {
      step: STEPS.CHAT,
      title: 'Чат',
      subtitle: 'Общение в комнате',
      completed: false,
      canGoBack: false,
      canGoNext: false
    }
  },
  
  // Session
  sessionStartTime: null,
  sessionId: null,
  lastActivity: null,
  
  // Form data
  formData: {
    username: '',
    pinCode: '',
    roomName: ''
  },
  
  // Preferences
  preferences: {
    theme: 'system',
    notifications: true,
    sounds: true,
    language: 'ru'
  }
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // ==================== USER MANAGEMENT ====================
      
      setUser: (user: User) => {
        set({ 
          currentUser: user,
          isAuthenticated: true,
          error: null,
          sessionStartTime: new Date(),
          lastActivity: new Date()
        })
      },
      
      updateUser: (updates: Partial<User>) => {
        set((state) => ({
          currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null,
          lastActivity: new Date()
        }))
      },
      
      clearUser: () => {
        set({
          currentUser: null,
          isAuthenticated: false,
          sessionId: null,
          sessionStartTime: null,
          formData: initialState.formData
        })
      },
      
      setAuthenticated: (authenticated: boolean) => {
        set({ isAuthenticated: authenticated })
      },
      
      // ==================== STEP MANAGEMENT ====================
      
      nextStep: () => {
        const { currentStep, stepHistory } = get()
        const nextStep = currentStep + 1
        
        if (nextStep <= STEPS.CHAT) {
          set({
            currentStep: nextStep,
            stepHistory: [...stepHistory, nextStep],
            canGoBack: stepHistory.length > 0,
            canGoNext: false // Reset next availability
          })
          
          // Update step completion
          get().updateStepData(currentStep, { completed: true })
        }
      },
      
      previousStep: () => {
        const { stepHistory } = get()
        
        if (stepHistory.length > 1) {
          const newHistory = [...stepHistory]
          newHistory.pop() // Remove current step
          const previousStep = newHistory[newHistory.length - 1]
          
          set({
            currentStep: previousStep,
            stepHistory: newHistory,
            canGoBack: newHistory.length > 1,
            canGoNext: true
          })
        }
      },
      
      setStep: (step: number) => {
        const { stepHistory } = get()
        
        if (step >= STEPS.USERNAME && step <= STEPS.CHAT) {
          set({
            currentStep: step,
            stepHistory: stepHistory.includes(step) ? stepHistory : [...stepHistory, step],
            canGoBack: step > STEPS.USERNAME,
            canGoNext: false
          })
        }
      },
      
      resetSteps: () => {
        set({
          currentStep: STEPS.USERNAME,
          stepHistory: [STEPS.USERNAME],
          canGoBack: false,
          canGoNext: false,
          stepData: initialState.stepData
        })
      },
      
      updateStepData: (step: number, data: Partial<StepData>) => {
        set((state) => ({
          stepData: {
            ...state.stepData,
            [step]: {
              ...state.stepData[step],
              ...data
            }
          }
        }))
      },
      
      // ==================== SESSION MANAGEMENT ====================
      
      startSession: () => {
        const now = new Date()
        set({
          sessionStartTime: now,
          lastActivity: now,
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
      },
      
      endSession: () => {
        set({
          sessionStartTime: null,
          sessionId: null,
          lastActivity: null,
          currentUser: null,
          isAuthenticated: false
        })
      },
      
      setSessionId: (sessionId: string) => {
        set({ sessionId })
      },
      
      updateLastActivity: () => {
        set({ lastActivity: new Date() })
      },
      
      // ==================== FORM DATA ====================
      
      updateFormData: (updates: Partial<UserStoreState['formData']>) => {
        set((state) => ({
          formData: { ...state.formData, ...updates }
        }))
      },
      
      clearFormData: () => {
        set({ formData: initialState.formData })
      },
      
      // ==================== STATE MANAGEMENT ====================
      
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
      
      setError: (error: string | null) => {
        set({ error })
      },
      
      clearError: () => {
        set({ error: null })
      },
      
      // ==================== PREFERENCES ====================
      
      updatePreferences: (updates: Partial<UserStoreState['preferences']>) => {
        set((state) => ({
          preferences: { ...state.preferences, ...updates }
        }))
      },
      
      setTheme: (theme: UserStoreState['preferences']['theme']) => {
        set((state) => ({
          preferences: { ...state.preferences, theme }
        }))
      },
      
      // ==================== GENERAL ====================
      
      reset: () => {
        set({
          ...initialState,
          preferences: get().preferences // Сохранить предпочтения
        })
      }
    }),
    {
      name: 'act-talk-user-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Сохранять только важные данные
        currentUser: state.currentUser,
        sessionId: state.sessionId,
        preferences: state.preferences,
        formData: state.formData,
        currentStep: state.currentStep
      }),
      skipHydration: false,
    }
  )
)

// Селекторы для удобства
export const useUserSelectors = {
  currentUser: () => useUserStore((state) => state.currentUser),
  currentStep: () => useUserStore((state) => state.currentStep),
  isAuthenticated: () => useUserStore((state) => state.isAuthenticated),
  error: () => useUserStore((state) => state.error),
  isLoading: () => useUserStore((state) => state.isLoading),
  canGoBack: () => useUserStore((state) => state.canGoBack),
  canGoNext: () => useUserStore((state) => state.canGoNext),
  stepData: () => useUserStore((state) => state.stepData),
  sessionStartTime: () => useUserStore((state) => state.sessionStartTime),
  sessionId: () => useUserStore((state) => state.sessionId),
  formData: () => useUserStore((state) => state.formData),
  preferences: () => useUserStore((state) => state.preferences)
}

// Actions для удобства
export const useUserActions = () => useUserStore((state) => ({
  setUser: state.setUser,
  updateUser: state.updateUser,
  clearUser: state.clearUser,
  setAuthenticated: state.setAuthenticated,
  nextStep: state.nextStep,
  previousStep: state.previousStep,
  setStep: state.setStep,
  resetSteps: state.resetSteps,
  updateStepData: state.updateStepData,
  startSession: state.startSession,
  endSession: state.endSession,
  setSessionId: state.setSessionId,
  updateLastActivity: state.updateLastActivity,
  updateFormData: state.updateFormData,
  clearFormData: state.clearFormData,
  setLoading: state.setLoading,
  setError: state.setError,
  clearError: state.clearError,
  updatePreferences: state.updatePreferences,
  setTheme: state.setTheme,
  reset: state.reset
}))