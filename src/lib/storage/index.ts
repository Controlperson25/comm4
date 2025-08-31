// src/lib/storage/index.ts

export { MemoryStore } from './memory-store'
export type {
  Room,
  Participant,
  Message,
  Session,
  CreateRoomData,
  JoinRoomData,
  CreateMessageData,
  GetMessagesOptions,
  GetMessagesResult,
  RoomJoinResult,
  StorageStats
} from './types'

// Singleton экземпляр для использования в API
export const memoryStore = MemoryStore.getInstance()