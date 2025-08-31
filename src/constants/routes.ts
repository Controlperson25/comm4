// src/constants/routes.ts

// App routes
export const ROUTES = {
  HOME: '/',
  CHAT: '/chat',
  CHAT_ROOM: (roomId: string) => `/chat/${roomId}`,
  
  // API routes
  API_BASE: '/api',
  API_USERS: '/api/users',
  API_ROOMS: '/api/rooms',
  API_ROOMS_CREATE: '/api/rooms/create',
  API_ROOMS_JOIN: (roomId: string) => `/api/rooms/${roomId}/join`,
  API_ROOMS_MESSAGES: (roomId: string) => `/api/rooms/${roomId}/messages`,
  API_UPLOAD: (roomId: string) => `/api/rooms/${roomId}/upload`,
  API_HEALTH: '/api/health',
} as const

// WebSocket endpoints
export const WS_ENDPOINTS = {
  CHAT: (roomId: string) => `/ws/chat/${roomId}`,
  NOTIFICATIONS: '/ws/notifications',
} as const

// External URLs
export const EXTERNAL_URLS = {
  MATRIX_HOMESERVER: process.env.NEXT_PUBLIC_MATRIX_HOMESERVER || 'https://matrix.org',
  DOCUMENTATION: 'https://docs.acttalk.com',
  SUPPORT: 'https://support.acttalk.com',
  PRIVACY: 'https://acttalk.com/privacy',
  TERMS: 'https://acttalk.com/terms',
} as const

// Environment URLs
export const ENV_URLS = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
} as const

// Route metadata
export const ROUTE_TITLES = {
  [ROUTES.HOME]: 'Act Talk Matrix - Безопасные временные чаты',
  [ROUTES.CHAT]: 'Чат - Act Talk Matrix',
} as const

// Navigation items
export const NAVIGATION = {
  main: [
    {
      name: 'Главная',
      href: ROUTES.HOME,
      icon: 'home',
    },
    {
      name: 'О проекте',
      href: '#about',
      icon: 'info',
    },
  ],
  footer: [
    {
      name: 'Конфиденциальность',
      href: EXTERNAL_URLS.PRIVACY,
    },
    {
      name: 'Условия использования',
      href: EXTERNAL_URLS.TERMS,
    },
    {
      name: 'Поддержка',
      href: EXTERNAL_URLS.SUPPORT,
    },
  ],
} as const