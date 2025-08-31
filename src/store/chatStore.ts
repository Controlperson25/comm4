// src/store/chatStore.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Message, Room, Participant, Session } from '@/lib/storage/types'

interface TypingUser {
  userId: string
  username: string
  timestamp: Date
}

interface ChatState {
  // Основные данные
  messages: Message[]
  currentRoom: Room | null
  participants: Participant[]
  currentSession: Session | null
  
  // Состояние подключения
  isConnected: boolean
  isConnecting: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastError: string | null
  reconnectAttempts: number
  
  // UI состояние
  isTyping: Record<string, boolean>
  typingUsers: TypingUser[]
  isLoading: boolean
  isSending: boolean
  
  // Метаданные
  lastMessageId: string | null
  hasMoreMessages: boolean
  unreadCount: number
  lastActivity: Date | null
}

interface ChatActions {
  // Действия с сообщениями
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  setMessages: (messages: Message[]) => void
  clearMessages: () => void
  markMessageAsSent: (tempId: string, serverMessage: Message) => void
  
  // Действия с комнатой
  setRoom: (room: Room) => void
  updateRoom: (updates: Partial<Room>) => void
  leaveRoom: () => void
  setCurrentSession: (session: Session) => void
  
  // Действия с участниками
  setParticipants: (participants: Participant[]) => void
  addParticipant: (participant: Participant) => void
  removeParticipant: (participantId: string) => void
  updateParticipant: (id: string, updates: Partial<Participant>) => void
  
  // Действия с подключением
  setConnected: (connected: boolean) => void
  setConnecting: (connecting: boolean) => void
  setConnectionStatus: (status: ChatState['connectionStatus']) => void
  setError: (error: string | null) => void
  incrementReconnectAttempts: () => void
  resetReconnectAttempts: () => void
  
  // Действия с печатанием
  setTyping: (userId: string, typing: boolean) => void
  addTypingUser: (user: TypingUser) => void
  removeTypingUser: (userId: string) => void
  clearTyping: () => void
  
  // UI действия
  setLoading: (loading: boolean) => void
  setSending: (sending: boolean) => void
  incrementUnreadCount: () => void
  resetUnreadCount: () => void
  updateLastActivity: () => void
  
  // Общие действия
  reset: () => void
}

type ChatStore = ChatState & ChatActions

const initialState: ChatState = {
  // Основные данные
  messages: [],
  currentRoom: null,
  participants: [],
  currentSession: null,
  
  // Состояние подключения
  isConnected: false,
  isConnecting: false,
  connectionStatus: 'disconnected',
  lastError: null,
  reconnectAttempts: 0,
  
  // UI состояние
  isTyping: {},
  typingUsers: [],
  isLoading: false,
  isSending: false,
  
  // Метаданные
  lastMessageId: null,
  hasMoreMessages: true,
  unreadCount: 0,
  lastActivity: null
}

export const useChatStore = create<ChatStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    // ==================== MESSAGES ====================
    
    addMessage: (message: Message) => {
      set((state) => {
        const exists = state.messages.some(m => m.id === message.id)
        if (exists) return state
        
        const newMessages = [...state.messages, message]
        // Сортировать по времени
        newMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        
        return {
          messages: newMessages,
          lastMessageId: message.id,
          lastActivity: new Date()
        }
      })
    },
    
    updateMessage: (id: string, updates: Partial<Message>) => {
      set((state) => ({
        messages: state.messages.map(msg => 
          msg.id === id ? { ...msg, ...updates } : msg
        )
      }))
    },
    
    setMessages: (messages: Message[]) => {
      set({ 
        messages: messages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ),
        lastMessageId: messages.length > 0 ? messages[messages.length - 1].id : null
      })
    },
    
    clearMessages: () => {
      set({ 
        messages: [], 
        lastMessageId: null,
        unreadCount: 0
      })
    },
    
    markMessageAsSent: (tempId: string, serverMessage: Message) => {
      set((state) => ({
        messages: state.messages.map(msg => 
          msg.id === tempId ? serverMessage : msg
        )
      }))
    },
    
    // ==================== ROOM ====================
    
    setRoom: (room: Room) => {
      set({ 
        currentRoom: room,
        lastActivity: new Date()
      })
    },
    
    updateRoom: (updates: Partial<Room>) => {
      set((state) => ({
        currentRoom: state.currentRoom ? { ...state.currentRoom, ...updates } : null
      }))
    },
    
    leaveRoom: () => {
      set({
        currentRoom: null,
        currentSession: null,
        messages: [],
        participants: [],
        isConnected: false,
        connectionStatus: 'disconnected',
        lastError: null,
        unreadCount: 0
      })
    },
    
    setCurrentSession: (session: Session) => {
      set({ currentSession: session })
    },
    
    // ==================== PARTICIPANTS ====================
    
    setParticipants: (participants: Participant[]) => {
      set({ participants })
    },
    
    addParticipant: (participant: Participant) => {
      set((state) => {
        const exists = state.participants.some(p => p.id === participant.id)
        if (exists) return state
        
        return {
          participants: [...state.participants, participant]
        }
      })
    },
    
    removeParticipant: (participantId: string) => {
      set((state) => ({
        participants: state.participants.filter(p => p.id !== participantId)
      }))
    },
    
    updateParticipant: (id: string, updates: Partial<Participant>) => {
      set((state) => ({
        participants: state.participants.map(p => 
          p.id === id ? { ...p, ...updates } : p
        )
      }))
    },
    
    // ==================== CONNECTION ====================
    
    setConnected: (connected: boolean) => {
      set({ 
        isConnected: connected,
        connectionStatus: connected ? 'connected' : 'disconnected',
        lastError: connected ? null : get().lastError
      })
    },
    
    setConnecting: (connecting: boolean) => {
      set({ 
        isConnecting: connecting,
        connectionStatus: connecting ? 'connecting' : get().connectionStatus
      })
    },
    
    setConnectionStatus: (status: ChatState['connectionStatus']) => {
      set({ 
        connectionStatus: status,
        isConnected: status === 'connected',
        isConnecting: status === 'connecting'
      })
    },
    
    setError: (error: string | null) => {
      set({ 
        lastError: error,
        connectionStatus: error ? 'error' : get().connectionStatus
      })
    },
    
    incrementReconnectAttempts: () => {
      set((state) => ({ 
        reconnectAttempts: state.reconnectAttempts + 1 
      }))
    },
    
    resetReconnectAttempts: () => {
      set({ reconnectAttempts: 0 })
    },
    
    // ==================== TYPING ====================
    
    setTyping: (userId: string, typing: boolean) => {
      set((state) => ({
        isTyping: {
          ...state.isTyping,
          [userId]: typing
        }
      }))
    },
    
    addTypingUser: (user: TypingUser) => {
      set((state) => {
        const filtered = state.typingUsers.filter(u => u.userId !== user.userId)
        return {
          typingUsers: [...filtered, user]
        }
      })
    },
    
    removeTypingUser: (userId: string) => {
      set((state) => ({
        typingUsers: state.typingUsers.filter(u => u.userId !== userId),
        isTyping: Object.fromEntries(
          Object.entries(state.isTyping).filter(([id]) => id !== userId)
        )
      }))
    },
    
    clearTyping: () => {
      set({ 
        isTyping: {},
        typingUsers: []
      })
    },
    
    // ==================== UI ====================
    
    setLoading: (loading: boolean) => {
      set({ isLoading: loading })
    },
    
    setSending: (sending: boolean) => {
      set({ isSending: sending })
    },
    
    incrementUnreadCount: () => {
      set((state) => ({ 
        unreadCount: state.unreadCount + 1 
      }))
    },
    
    resetUnreadCount: () => {
      set({ unreadCount: 0 })
    },
    
    updateLastActivity: () => {
      set({ lastActivity: new Date() })
    },
    
    // ==================== GENERAL ====================
    
    reset: () => {
      set(initialState)
    }
  }))
)

// Селекторы для удобства использования
export const useChatSelectors = {
  messages: () => useChatStore((state) => state.messages),
  currentRoom: () => useChatStore((state) => state.currentRoom),
  participants: () => useChatStore((state) => state.participants),
  currentSession: () => useChatStore((state) => state.currentSession),
  isConnected: () => useChatStore((state) => state.isConnected),
  isConnecting: () => useChatStore((state) => state.isConnecting),
  connectionStatus: () => useChatStore((state) => state.connectionStatus),
  lastError: () => useChatStore((state) => state.lastError),
  isLoading: () => useChatStore((state) => state.isLoading),
  isSending: () => useChatStore((state) => state.isSending),
  typingUsers: () => useChatStore((state) => state.typingUsers),
  unreadCount: () => useChatStore((state) => state.unreadCount),
  hasMoreMessages: () => useChatStore((state) => state.hasMoreMessages)
}

// Actions для удобства использования
export const useChatActions = () => useChatStore((state) => ({
  addMessage: state.addMessage,
  updateMessage: state.updateMessage,
  setMessages: state.setMessages,
  clearMessages: state.clearMessages,
  setRoom: state.setRoom,
  updateRoom: state.updateRoom,
  leaveRoom: state.leaveRoom,
  setCurrentSession: state.setCurrentSession,
  setParticipants: state.setParticipants,
  addParticipant: state.addParticipant,
  removeParticipant: state.removeParticipant,
  updateParticipant: state.updateParticipant,
  setConnected: state.setConnected,
  setConnecting: state.setConnecting,
  setConnectionStatus: state.setConnectionStatus,
  setError: state.setError,
  setLoading: state.setLoading,
  setSending: state.setSending,
  setTyping: state.setTyping,
  addTypingUser: state.addTypingUser,
  removeTypingUser: state.removeTypingUser,
  clearTyping: state.clearTyping,
  incrementUnreadCount: state.incrementUnreadCount,
  resetUnreadCount: state.resetUnreadCount,
  updateLastActivity: state.updateLastActivity,
  reset: state.reset
}))