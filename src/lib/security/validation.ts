import { z } from 'zod'
export function sanitizeInput(input: string): string {
  return input.trim()
}

export function sanitizeMessage(message: string): string {
  return message.trim()
}
export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  }).trim()
}

export function sanitizeMessage(message: string): string {
  return DOMPurify.sanitize(message, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code'],
    ALLOWED_ATTR: []
  }).trim()
}

export const sanitizedUsernameSchema = z.string()
  .transform(sanitizeInput)
  .pipe(z.string()
    .min(2, 'Username must be at least 2 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens')
  )

export const sanitizedMessageSchema = z.string()
  .transform(sanitizeMessage)
  .pipe(z.string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message too long (max 1000 characters)')
  )

export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024 // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File too large (max 5MB)' }
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type' }
  }
  
  return { valid: true }
}

export class RateLimiter {
  private attempts: Map<string, number[]> = new Map()
  
  constructor(
    private maxAttempts: number,
    private windowMs: number
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const userAttempts = this.attempts.get(identifier) || []
    
    const validAttempts = userAttempts.filter(
      timestamp => now - timestamp < this.windowMs
    )
    
    if (validAttempts.length >= this.maxAttempts) {
      return false
    }
    
    validAttempts.push(now)
    this.attempts.set(identifier, validAttempts)
    
    return true
  }
}

export const messageRateLimiter = new RateLimiter(10, 60 * 1000)