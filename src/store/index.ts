// src/store/index.ts

// Chat Store
export {
  useChatStore,
  useChatSelectors,
  useChatActions
} from './chatStore'

// User Store  
export {
  useUserStore,
  useUserSelectors,
  useUserActions
} from './userStore'

// UI Store
export {
  useUIStore,
  useUISelectors,
  useUIActions,
  useNotifications,
  useModal,
  useLoadingState
} from './uiStore'

// Store types
export type { ChatState, ChatActions } from './chatStore'
export type { UserState, UserActions } from './userStore'
export type { UIState, UIActions } from './uiStore'

// Combined hooks для комплексных операций
export const useAppState = () => {
  const chatSelectors = useChatSelectors
  const userSelectors = useUserSelectors
  const uiSelectors = useUISelectors
  
  return {
    // Chat state
    messages: chatSelectors.messages(),
    currentRoom: chatSelectors.currentRoom(),
    participants: chatSelectors.participants(),
    isConnected: chatSelectors.isConnected(),
    connectionStatus: chatSelectors.connectionStatus(),
    
    // User state
    currentUser: userSelectors.currentUser(),
    currentStep: userSelectors.currentStep(),
    isAuthenticated: userSelectors.isAuthenticated(),
    
    // UI state
    isLoading: uiSelectors.isLoading(),
    notifications: uiSelectors.notifications(),
    theme: uiSelectors.theme()
  }
}

export const useAppActions = () => {
  const chatActions = useChatActions()
  const userActions = useUserActions()
  const uiActions = useUIActions()
  
  return {
    // Chat actions
    addMessage: chatActions.addMessage,
    setRoom: chatActions.setRoom,
    leaveRoom: chatActions.leaveRoom,
    setConnected: chatActions.setConnected,
    
    // User actions
    setUser: userActions.setUser,
    nextStep: userActions.nextStep,
    setStep: userActions.setStep,
    
    // UI actions
    addNotification: uiActions.addNotification,
    setLoading: uiActions.setLoading,
    setTheme: uiActions.setTheme
  }
}

// Utility hooks
export const useStoreReset = () => {
  const chatActions = useChatActions()
  const userActions = useUserActions()
  const uiActions = useUIActions()
  
  return () => {
    chatActions.reset()
    userActions.reset()
    uiActions.reset()
  }
}

export const useStoreHydration = () => {
  const userStore = useUserStore()
  
  return {
    isHydrated: userStore.isAuthenticated !== undefined,
    rehydrate: () => {
      // Force rehydration from localStorage
      userStore.persist.rehydrate()
    }
  }
}