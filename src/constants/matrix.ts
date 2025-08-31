// constants/matrix.ts
export const MATRIX_CONFIG = {
  HOMESERVER_URL: process.env.NEXT_PUBLIC_MATRIX_HOMESERVER || 'https://matrix.org',
  SERVER_NAME: process.env.NEXT_PUBLIC_MATRIX_SERVER_NAME || 'matrix.org',
  ROOM_VERSION: '9',
  ENCRYPTION_ALGORITHM: 'm.megolm.v1.aes-sha2'
} as const

export const MATRIX_EVENTS = {
  ROOM_MESSAGE: 'm.room.message',
  ROOM_MEMBER: 'm.room.member',
  ROOM_ENCRYPTION: 'm.room.encryption',
  TYPING: 'm.typing',
  RECEIPT: 'm.receipt'
} as const

export const ROOM_PRESETS = {
  PRIVATE_CHAT: 'private_chat',
  PUBLIC_CHAT: 'public_chat',
  TRUSTED_PRIVATE_CHAT: 'trusted_private_chat'
} as const