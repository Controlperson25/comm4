// constants/ui.ts
export const STEPS = {
  USERNAME: 1,
  CREATE_ROOM: 2,
  JOIN_ROOM: 3,
  CHAT: 4
} as const

export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_-]+$/
  },
  PIN_CODE: {
    LENGTH: 4,
    PATTERN: /^\d{4}$/
  },
  MESSAGE: {
    MAX_LENGTH: 1000
  }
} as const

export const UI_CONFIG = {
  SESSION_WARNING_THRESHOLD: 5, // минут
  DEFAULT_SESSION_DURATION: 60, // минут
  MESSAGE_RATE_LIMIT: 10, // сообщений в минуту
  TYPING_TIMEOUT: 3000, // мс
  RECONNECT_DELAY: 1000, // мс
  MAX_RECONNECT_ATTEMPTS: 5,
  FILE_SIZE_LIMIT: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
} as const

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
} as const

export const CONNECTION_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
} as const

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  SYSTEM: 'system'
} as const

export const SUCCESS_MESSAGES = {
  USER_CREATED: 'Пользователь создан успешно',
  ROOM_CREATED: 'Комната создана',
  ROOM_JOINED: 'Подключение к комнате выполнено',
  MESSAGE_SENT: 'Сообщение отправлено',
  FILE_UPLOADED: 'Файл загружен'
} as const

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Ошибка сети',
  INVALID_PIN: 'Неверный PIN-код',
  ROOM_NOT_FOUND: 'Комната не найдена',
  USER_EXISTS: 'Пользователь уже существует',
  FILE_TOO_LARGE: 'Файл слишком большой',
  INVALID_FILE_TYPE: 'Неподдерживаемый тип файла',
  SESSION_EXPIRED: 'Сессия истекла'
} as const