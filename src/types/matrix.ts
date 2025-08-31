// types/matrix.ts
export interface MatrixConfig {
  homeserverUrl: string
  serverName: string
  userId?: string
  accessToken?: string
  deviceId?: string
  syncOptions?: {
    initialSyncLimit?: number
    resolveInvitesToProfiles?: boolean
    lazyLoadMembers?: boolean
  }
}

export interface MatrixRoom {
  roomId: string
  name: string
  topic?: string
  encrypted: boolean
  members: string[]
  powerLevels?: Record<string, number>
  joinRule?: 'public' | 'invite' | 'private'
  historyVisibility?: 'invited' | 'joined' | 'shared' | 'world_readable'
}

export interface MatrixUser {
  userId: string
  displayName?: string
  avatarUrl?: string
  presence?: 'online' | 'offline' | 'unavailable'
  lastActiveAgo?: number
  statusMsg?: string
}

export interface MatrixEvent {
  eventId: string
  type: string
  sender: string
  roomId: string
  timestamp: number
  content: any
  stateKey?: string
  redacts?: string
  unsigned?: {
    age?: number
    transactionId?: string
    redactedBecause?: MatrixEvent
  }
}

export interface MatrixMessage extends MatrixEvent {
  type: 'm.room.message'
  content: {
    msgtype: 'm.text' | 'm.image' | 'm.file' | 'm.audio' | 'm.video' | 'm.location'
    body: string
    format?: 'org.matrix.custom.html'
    formatted_body?: string
    url?: string
    info?: {
      mimetype?: string
      size?: number
      w?: number
      h?: number
      duration?: number
      thumbnail_url?: string
      thumbnail_info?: {
        w?: number
        h?: number
        mimetype?: string
        size?: number
      }
    }
    'm.relates_to'?: {
      rel_type?: 'm.replace' | 'm.annotation'
      event_id?: string
      key?: string
      'm.new_content'?: any
    }
  }
}

export interface MatrixRoomState {
  name?: string
  topic?: string
  avatar?: string
  joinRule?: 'public' | 'invite' | 'private'
  historyVisibility?: 'invited' | 'joined' | 'shared' | 'world_readable'
  guestAccess?: 'can_join' | 'forbidden'
  encryption?: {
    algorithm: string
    rotation_period_ms?: number
    rotation_period_msgs?: number
  }
  powerLevels?: {
    ban?: number
    events?: Record<string, number>
    events_default?: number
    invite?: number
    kick?: number
    redact?: number
    state_default?: number
    users?: Record<string, number>
    users_default?: number
    notifications?: {
      room?: number
    }
  }
}

export interface MatrixCreateRoomOptions {
  name?: string
  topic?: string
  room_alias_name?: string
  visibility?: 'public' | 'private'
  room_version?: string
  creation_content?: Record<string, any>
  initial_state?: Array<{
    type: string
    state_key?: string
    content: any
  }>
  preset?: 'private_chat' | 'public_chat' | 'trusted_private_chat'
  is_direct?: boolean
  power_level_content_override?: MatrixRoomState['powerLevels']
  invite?: string[]
  invite_3pid?: Array<{
    id_server: string
    id_access_token: string
    medium: 'email' | 'msisdn'
    address: string
  }>
}

export interface MatrixSyncResponse {
  next_batch: string
  rooms?: {
    join?: Record<string, MatrixJoinedRoom>
    invite?: Record<string, MatrixInvitedRoom>
    leave?: Record<string, MatrixLeftRoom>
  }
  presence?: {
    events: MatrixEvent[]
  }
  account_data?: {
    events: MatrixEvent[]
  }
  to_device?: {
    events: MatrixEvent[]
  }
  device_lists?: {
    changed?: string[]
    left?: string[]
  }
  device_one_time_keys_count?: Record<string, number>
}

export interface MatrixJoinedRoom {
  summary?: {
    'm.heroes'?: string[]
    'm.joined_member_count'?: number
    'm.invited_member_count'?: number
  }
  state?: {
    events: MatrixEvent[]
  }
  timeline?: {
    events: MatrixEvent[]
    limited?: boolean
    prev_batch?: string
  }
  ephemeral?: {
    events: MatrixEvent[]
  }
  account_data?: {
    events: MatrixEvent[]
  }
  unread_notifications?: {
    highlight_count?: number
    notification_count?: number
  }
}

export interface MatrixInvitedRoom {
  invite_state?: {
    events: MatrixEvent[]
  }
}

export interface MatrixLeftRoom {
  state?: {
    events: MatrixEvent[]
  }
  timeline?: {
    events: MatrixEvent[]
    limited?: boolean
    prev_batch?: string
  }
  account_data?: {
    events: MatrixEvent[]
  }
}

export interface MatrixError {
  errcode: string
  error: string
  retry_after_ms?: number
}

// Константы для Matrix
export const MATRIX_EVENTS = {
  MESSAGE: 'm.room.message',
  MEMBER: 'm.room.member',
  NAME: 'm.room.name',
  TOPIC: 'm.room.topic',
  AVATAR: 'm.room.avatar',
  POWER_LEVELS: 'm.room.power_levels',
  JOIN_RULES: 'm.room.join_rules',
  HISTORY_VISIBILITY: 'm.room.history_visibility',
  ENCRYPTION: 'm.room.encryption',
  CREATE: 'm.room.create',
  REDACTION: 'm.room.redaction',
  TYPING: 'm.typing',
  RECEIPT: 'm.receipt',
  PRESENCE: 'm.presence'
} as const

export const MATRIX_MESSAGE_TYPES = {
  TEXT: 'm.text',
  IMAGE: 'm.image',
  FILE: 'm.file',
  AUDIO: 'm.audio',
  VIDEO: 'm.video',
  LOCATION: 'm.location',
  NOTICE: 'm.notice',
  EMOTE: 'm.emote'
} as const

export const MATRIX_MEMBERSHIP = {
  INVITE: 'invite',
  JOIN: 'join',
  LEAVE: 'leave',
  BAN: 'ban',
  KNOCK: 'knock'
} as const