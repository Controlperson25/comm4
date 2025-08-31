// src/store/uiStore.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  actions?: Array<{
    label: string
    action: () => void
    variant?: 'default' | 'destructive'
  }>
  timestamp: Date
}

interface Modal {
  id: string
  type: 'settings' | 'help' | 'leave' | 'upload' | 'custom'
  title: string
  content?: string
  onConfirm?: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  data?: any
}

interface LoadingState {
  [key: string]: boolean
}

interface UIState {
  // Layout
  sidebarOpen: boolean
  headerVisible: boolean
  footerVisible: boolean
  
  // Theme
  theme: 'light' | 'dark' | 'system'
  isDarkMode: boolean
  
  // Notifications
  notifications: Notification[]
  maxNotifications: number
  
  // Modals
  modals: Modal[]
  
  // Loading states
  loading: LoadingState
  globalLoading: boolean
  
  // UI preferences
  animationsEnabled: boolean
  reducedMotion: boolean
  compactMode: boolean
  
  // Navigation
  currentPage: string
  previousPage: string | null
  breadcrumbs: Array<{ label: string; path: string }>
  
  // Form states
  formErrors: Record<string, string>
  formTouched: Record<string, boolean>
  
  // Mobile
  isMobile: boolean
  touchSupport: boolean
  
  // Network
  isOnline: boolean
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline'
}

interface UIActions {
  // Layout
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setHeaderVisible: (visible: boolean) => void
  setFooterVisible: (visible: boolean) => void
  
  // Theme
  setTheme: (theme: UIState['theme']) => void
  toggleTheme: () => void
  setDarkMode: (dark: boolean) => void
  
  // Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  updateNotification: (id: string, updates: Partial<Notification>) => void
  
  // Modals
  openModal: (modal: Omit<Modal, 'id'>) => void
  closeModal: (id: string) => void
  closeAllModals: () => void
  updateModal: (id: string, updates: Partial<Modal>) => void
  
  // Loading states
  setLoading: (key: string, loading: boolean) => void
  clearLoading: (key: string) => void
  setGlobalLoading: (loading: boolean) => void
  
  // Form states
  setFormError: (field: string, error: string) => void
  clearFormError: (field: string) => void
  clearAllFormErrors: () => void
  setFormTouched: (field: string, touched: boolean) => void
  clearFormTouched: (field: string) => void
  
  // Preferences
  setAnimationsEnabled: (enabled: boolean) => void
  setReducedMotion: (reduced: boolean) => void
  setCompactMode: (compact: boolean) => void
  
  // Navigation
  setCurrentPage: (page: string) => void
  updateBreadcrumbs: (breadcrumbs: UIState['breadcrumbs']) => void
  
  // Device
  setIsMobile: (mobile: boolean) => void
  setTouchSupport: (support: boolean) => void
  
  // Network
  setOnline: (online: boolean) => void
  setConnectionQuality: (quality: UIState['connectionQuality']) => void
  
  // General
  reset: () => void
}

type UIStore = UIState & UIActions

const initialState: UIState = {
  // Layout
  sidebarOpen: false,
  headerVisible: true,
  footerVisible: true,
  
  // Theme
  theme: 'system',
  isDarkMode: false,
  
  // Notifications
  notifications: [],
  maxNotifications: 5,
  
  // Modals
  modals: [],
  
  // Loading
  loading: {},
  globalLoading: false,
  
  // Preferences
  animationsEnabled: true,
  reducedMotion: false,
  compactMode: false,
  
  // Navigation
  currentPage: '/',
  previousPage: null,
  breadcrumbs: [],
  
  // Forms
  formErrors: {},
  formTouched: {},
  
  // Device
  isMobile: false,
  touchSupport: false,
  
  // Network
  isOnline: true,
  connectionQuality: 'excellent'
}

export const useUIStore = create<UIStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    // ==================== LAYOUT ====================
    
    toggleSidebar: () => {
      set((state) => ({ sidebarOpen: !state.sidebarOpen }))
    },
    
    setSidebarOpen: (open: boolean) => {
      set({ sidebarOpen: open })
    },
    
    setHeaderVisible: (visible: boolean) => {
      set({ headerVisible: visible })
    },
    
    setFooterVisible: (visible: boolean) => {
      set({ footerVisible: visible })
    },
    
    // ==================== THEME ====================
    
    setTheme: (theme: UIState['theme']) => {
      set({ theme })
      
      // Update dark mode based on theme and system preference
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        set({ isDarkMode: prefersDark })
      } else {
        set({ isDarkMode: theme === 'dark' })
      }
    },
    
    toggleTheme: () => {
      const { theme } = get()
      const newTheme = theme === 'light' ? 'dark' : 'light'
      get().setTheme(newTheme)
    },
    
    setDarkMode: (dark: boolean) => {
      set({ isDarkMode: dark })
    },
    
    // ==================== NOTIFICATIONS ====================
    
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => {
      const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const newNotification: Notification = {
        ...notification,
        id,
        timestamp: new Date(),
        duration: notification.duration || 5000
      }
      
      set((state) => {
        let notifications = [...state.notifications, newNotification]
        
        // Ограничить количество уведомлений
        if (notifications.length > state.maxNotifications) {
          notifications = notifications.slice(-state.maxNotifications)
        }
        
        return { notifications }
      })
      
      // Автоудаление уведомления
      if (newNotification.duration && newNotification.duration > 0) {
        setTimeout(() => {
          get().removeNotification(id)
        }, newNotification.duration)
      }
    },
    
    removeNotification: (id: string) => {
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      }))
    },
    
    clearNotifications: () => {
      set({ notifications: [] })
    },
    
    updateNotification: (id: string, updates: Partial<Notification>) => {
      set((state) => ({
        notifications: state.notifications.map(n => 
          n.id === id ? { ...n, ...updates } : n
        )
      }))
    },
    
    // ==================== MODALS ====================
    
    openModal: (modal: Omit<Modal, 'id'>) => {
      const id = `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const newModal: Modal = { ...modal, id }
      
      set((state) => ({
        modals: [...state.modals, newModal]
      }))
    },
    
    closeModal: (id: string) => {
      set((state) => ({
        modals: state.modals.filter(m => m.id !== id)
      }))
    },
    
    closeAllModals: () => {
      set({ modals: [] })
    },
    
    updateModal: (id: string, updates: Partial<Modal>) => {
      set((state) => ({
        modals: state.modals.map(m => 
          m.id === id ? { ...m, ...updates } : m
        )
      }))
    },
    
    // ==================== LOADING ====================
    
    setLoading: (key: string, loading: boolean) => {
      set((state) => ({
        loading: {
          ...state.loading,
          [key]: loading
        }
      }))
    },
    
    clearLoading: (key: string) => {
      set((state) => {
        const newLoading = { ...state.loading }
        delete newLoading[key]
        return { loading: newLoading }
      })
    },
    
    setGlobalLoading: (loading: boolean) => {
      set({ globalLoading: loading })
    },
    
    // ==================== FORM STATES ====================
    
    setFormError: (field: string, error: string) => {
      set((state) => ({
        formErrors: { ...state.formErrors, [field]: error }
      }))
    },
    
    clearFormError: (field: string) => {
      set((state) => {
        const newErrors = { ...state.formErrors }
        delete newErrors[field]
        return { formErrors: newErrors }
      })
    },
    
    clearAllFormErrors: () => {
      set({ formErrors: {} })
    },
    
    setFormTouched: (field: string, touched: boolean) => {
      set((state) => ({
        formTouched: { ...state.formTouched, [field]: touched }
      }))
    },
    
    clearFormTouched: (field: string) => {
      set((state) => {
        const newTouched = { ...state.formTouched }
        delete newTouched[field]
        return { formTouched: newTouched }
      })
    },
    
    // ==================== PREFERENCES ====================
    
    setAnimationsEnabled: (enabled: boolean) => {
      set({ animationsEnabled: enabled })
    },
    
    setReducedMotion: (reduced: boolean) => {
      set({ reducedMotion: reduced })
    },
    
    setCompactMode: (compact: boolean) => {
      set({ compactMode: compact })
    },
    
    // ==================== NAVIGATION ====================
    
    setCurrentPage: (page: string) => {
      set((state) => ({
        previousPage: state.currentPage,
        currentPage: page
      }))
    },
    
    updateBreadcrumbs: (breadcrumbs: UIState['breadcrumbs']) => {
      set({ breadcrumbs })
    },
    
    // ==================== DEVICE ====================
    
    setIsMobile: (mobile: boolean) => {
      set({ isMobile: mobile })
    },
    
    setTouchSupport: (support: boolean) => {
      set({ touchSupport: support })
    },
    
    // ==================== NETWORK ====================
    
    setOnline: (online: boolean) => {
      set({ 
        isOnline: online,
        connectionQuality: online ? get().connectionQuality : 'offline'
      })
    },
    
    setConnectionQuality: (quality: UIState['connectionQuality']) => {
      set({ connectionQuality: quality })
    },
    
    // ==================== GENERAL ====================
    
    reset: () => {
      set(initialState)
    }
  }))
)

// Селекторы
export const useUISelectors = {
  sidebarOpen: () => useUIStore((state) => state.sidebarOpen),
  theme: () => useUIStore((state) => state.theme),
  isDarkMode: () => useUIStore((state) => state.isDarkMode),
  notifications: () => useUIStore((state) => state.notifications),
  modals: () => useUIStore((state) => state.modals),
  isLoading: (key?: string) => useUIStore((state) => 
    key ? state.loading[key] || false : state.globalLoading
  ),
  formErrors: () => useUIStore((state) => state.formErrors),
  formTouched: () => useUIStore((state) => state.formTouched),
  currentPage: () => useUIStore((state) => state.currentPage),
  breadcrumbs: () => useUIStore((state) => state.breadcrumbs),
  isMobile: () => useUIStore((state) => state.isMobile),
  isOnline: () => useUIStore((state) => state.isOnline),
  connectionQuality: () => useUIStore((state) => state.connectionQuality)
}

// Actions
export const useUIActions = () => useUIStore((state) => ({
  toggleSidebar: state.toggleSidebar,
  setSidebarOpen: state.setSidebarOpen,
  setTheme: state.setTheme,
  toggleTheme: state.toggleTheme,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
  openModal: state.openModal,
  closeModal: state.closeModal,
  closeAllModals: state.closeAllModals,
  setLoading: state.setLoading,
  clearLoading: state.clearLoading,
  setGlobalLoading: state.setGlobalLoading,
  setFormError: state.setFormError,
  clearFormError: state.clearFormError,
  clearAllFormErrors: state.clearAllFormErrors,
  setFormTouched: state.setFormTouched,
  clearFormTouched: state.clearFormTouched,
  setCurrentPage: state.setCurrentPage,
  updateBreadcrumbs: state.updateBreadcrumbs,
  setIsMobile: state.setIsMobile,
  setOnline: state.setOnline,
  setConnectionQuality: state.setConnectionQuality,
  reset: state.reset
}))

// Хуки для convenience
export const useNotifications = () => {
  const notifications = useUISelectors.notifications()
  const actions = useUIActions()
  
  return {
    notifications,
    addSuccess: (title: string, message: string) => 
      actions.addNotification({ type: 'success', title, message }),
    addError: (title: string, message: string) => 
      actions.addNotification({ type: 'error', title, message, duration: 8000 }),
    addWarning: (title: string, message: string) => 
      actions.addNotification({ type: 'warning', title, message }),
    addInfo: (title: string, message: string) => 
      actions.addNotification({ type: 'info', title, message }),
    remove: actions.removeNotification,
    clear: actions.clearNotifications
  }
}

export const useModal = () => {
  const modals = useUISelectors.modals()
  const actions = useUIActions()
  
  return {
    modals,
    openSettings: () => actions.openModal({
      type: 'settings',
      title: 'Настройки'
    }),
    openHelp: () => actions.openModal({
      type: 'help',
      title: 'Помощь'
    }),
    openLeaveConfirm: (onConfirm: () => void) => actions.openModal({
      type: 'leave',
      title: 'Покинуть комнату',
      content: 'Вы уверены, что хотите покинуть комнату?',
      onConfirm,
      confirmText: 'Покинуть',
      cancelText: 'Отмена'
    }),
    close: actions.closeModal,
    closeAll: actions.closeAllModals
  }
}

export const useLoadingState = () => {
  const actions = useUIActions()
  
  return {
    setLoading: actions.setLoading,
    clearLoading: actions.clearLoading,
    isLoading: useUISelectors.isLoading,
    withLoading: async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
      try {
        actions.setLoading(key, true)
        return await fn()
      } finally {
        actions.setLoading(key, false)
      }
    }
  }
}