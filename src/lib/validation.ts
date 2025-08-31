// src/lib/validation.ts
import { z } from 'zod'
import { INPUT_LIMITS } from '@/constants/ui'

// Username validation
export const usernameSchema = z.object({
  username: z.string()
    .min(INPUT_LIMITS.USERNAME_MIN, `Минимум ${INPUT_LIMITS.USERNAME_MIN} символа`)
    .max(INPUT_LIMITS.USERNAME_MAX, `Максимум ${INPUT_LIMITS.USERNAME_MAX} символов`)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Только буквы, цифры, _ и -')
    .refine(val => !val.startsWith('_'), 'Не может начинаться с _')
    .refine(val => !val.endsWith('_'), 'Не может заканчиваться на _')
    .refine(val => val.trim().length > 0, 'Имя не может быть пустым')
})

// PIN code validation
export const pinCodeSchema = z.object({
  pinCode: z.string()
    .length(INPUT_LIMITS.PIN_CODE_LENGTH, `PIN должен состоять из ${INPUT_LIMITS.PIN_CODE_LENGTH} цифр`)
    .regex(/^\d{4}$/, 'Только цифры')
    .refine(val => val !== '0000', 'PIN не может быть 0000')
    .refine(val => !/^(\d)\1{3}$/.test(val), 'PIN не может состоять из одинаковых цифр')
})

// Message validation
export const messageSchema = z.object({
  content: z.string()
    .min(1, 'Сообщение не может быть пустым')
    .max(INPUT_LIMITS.MESSAGE_MAX, `Максимум ${INPUT_LIMITS.MESSAGE_MAX} символов`)
    .refine(val => val.trim().length > 0, 'Сообщение не может содержать только пробелы')
})

// Room creation validation
export const createRoomSchema = z.object({
  username: usernameSchema.shape.username,
  pinCode: pinCodeSchema.shape.pinCode,
  expirationMinutes: z.number()
    .min(5, 'Минимум 5 минут')
    .max(1440, 'Максимум 24 часа')
    .default(60)
    .optional()
})

// Join room validation
export const joinRoomSchema = z.object({
  username: usernameSchema.shape.username,
  pinCode: pinCodeSchema.shape.pinCode,
  partnerUsername: z.string()
    .min(INPUT_LIMITS.USERNAME_MIN)
    .max(INPUT_LIMITS.USERNAME_MAX)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional()
})

// File upload validation
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(file => file.size <= INPUT_LIMITS.FILE_SIZE_MAX, 'Файл слишком большой (максимум 5MB)')
    .refine(
      file => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type),
      'Неподдерживаемый тип файла'
    ),
  caption: z.string()
    .max(200, 'Максимум 200 символов')
    .optional()
})

// Client-side validation helpers
export const validateUsername = (username: string) => {
  try {
    usernameSchema.parse({ username })
    return { valid: true, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message }
    }
    return { valid: false, error: 'Ошибка валидации' }
  }
}

export const validatePinCode = (pinCode: string) => {
  try {
    pinCodeSchema.parse({ pinCode })
    return { valid: true, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message }
    }
    return { valid: false, error: 'Ошибка валидации' }
  }
}

export const validateMessage = (content: string) => {
  try {
    messageSchema.parse({ content })
    return { valid: true, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message }
    }
    return { valid: false, error: 'Ошибка валидации' }
  }
}

export const validateFile = (file: File) => {
  try {
    fileUploadSchema.parse({ file })
    return { valid: true, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message }
    }
    return { valid: false, error: 'Ошибка валидации файла' }
  }
}

// Type exports
export type UsernameInput = z.infer<typeof usernameSchema>
export type PinCodeInput = z.infer<typeof pinCodeSchema>
export type MessageInput = z.infer<typeof messageSchema>
export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type JoinRoomInput = z.infer<typeof joinRoomSchema>
export type FileUploadInput = z.infer<typeof fileUploadSchema>