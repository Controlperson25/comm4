// src/lib/config/environment.ts
interface Environment {
  // App
  NODE_ENV: 'development' | 'production' | 'test'
  PORT: number
  
  // URLs
  NEXT_PUBLIC_APP_URL: string
  NEXT_PUBLIC_API_URL: string
  NEXT_PUBLIC_WS_URL: string
  
  // Matrix
  NEXT_PUBLIC_MATRIX_HOMESERVER: string
  NEXT_PUBLIC_MATRIX_SERVER_NAME: string
  MATRIX_APPLICATION_SERVICE_TOKEN?: string
  MATRIX_HOMESERVER_TOKEN?: string
  
  // Security
  JWT_SECRET?: string
  ENCRYPTION_KEY?: string
  
  // Upload
  MAX_FILE_SIZE: number
  ALLOWED_FILE_TYPES: string[]
  UPLOAD_DIR: string
  
  // Rate Limiting
  RATE_LIMIT_REQUESTS: number
  RATE_LIMIT_WINDOW: number
  
  // Session
  SESSION_TIMEOUT: number
  ROOM_TIMEOUT: number
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue
  if (!value) {
    throw new Error(`Environment variable ${key} is required`)
  }
  return value
}

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key]
  return value ? parseInt(value, 10) : defaultValue
}

const getEnvArray = (key: string, defaultValue: string[]): string[] => {
  const value = process.env[key]
  return value ? value.split(',').map(s => s.trim()) : defaultValue
}

export const env: Environment = {
  // App
  NODE_ENV: (process.env.NODE_ENV as Environment['NODE_ENV']) || 'development',
  PORT: getEnvNumber('PORT', 3000),
  
  // URLs
  NEXT_PUBLIC_APP_URL: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  NEXT_PUBLIC_API_URL: getEnvVar('NEXT_PUBLIC_API_URL', 'http://localhost:3000'),
  NEXT_PUBLIC_WS_URL: getEnvVar('NEXT_PUBLIC_WS_URL', 'ws://localhost:3001'),
  
  // Matrix
  NEXT_PUBLIC_MATRIX_HOMESERVER: getEnvVar('NEXT_PUBLIC_MATRIX_HOMESERVER', 'https://matrix.org'),
  NEXT_PUBLIC_MATRIX_SERVER_NAME: getEnvVar('NEXT_PUBLIC_MATRIX_SERVER_NAME', 'matrix.org'),
  MATRIX_APPLICATION_SERVICE_TOKEN: process.env.MATRIX_APPLICATION_SERVICE_TOKEN,
  MATRIX_HOMESERVER_TOKEN: process.env.MATRIX_HOMESERVER_TOKEN,
  
  // Security
  JWT_SECRET: process.env.JWT_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  
  // Upload
  MAX_FILE_SIZE: getEnvNumber('MAX_FILE_SIZE', 5 * 1024 * 1024), // 5MB
  ALLOWED_FILE_TYPES: getEnvArray('ALLOWED_FILE_TYPES', [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp'
  ]),
  UPLOAD_DIR: getEnvVar('UPLOAD_DIR', 'public/uploads'),
  
  // Rate Limiting
  RATE_LIMIT_REQUESTS: getEnvNumber('RATE_LIMIT_REQUESTS', 100),
  RATE_LIMIT_WINDOW: getEnvNumber('RATE_LIMIT_WINDOW', 15 * 60 * 1000), // 15 minutes
  
  // Session
  SESSION_TIMEOUT: getEnvNumber('SESSION_TIMEOUT', 60 * 60 * 1000), // 1 hour
  ROOM_TIMEOUT: getEnvNumber('ROOM_TIMEOUT', 60 * 60 * 1000) // 1 hour
}

// Validation
export const validateEnvironment = (): void => {
  const requiredVars = [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_MATRIX_HOMESERVER',
    'NEXT_PUBLIC_MATRIX_SERVER_NAME'
  ]
  
  const missing = requiredVars.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  
  // Validate URLs
  try {
    new URL(env.NEXT_PUBLIC_APP_URL)
    new URL(env.NEXT_PUBLIC_API_URL)
    new URL(env.NEXT_PUBLIC_MATRIX_HOMESERVER)
  } catch (error) {
    throw new Error('Invalid URL format in environment variables')
  }
  
  console.log('✅ Environment validation passed')
}

// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/config/environment'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// Simple in-memory rate limiting (use Redis in production)
const rateLimitStore: RateLimitStore = {}

function getRateLimitKey(request: NextRequest): string {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'anonymous'
  const pathname = request.nextUrl.pathname
  return `${ip}:${pathname}`
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const record = rateLimitStore[key]
  
  if (!record || now > record.resetTime) {
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + env.RATE_LIMIT_WINDOW
    }
    return false
  }
  
  if (record.count >= env.RATE_LIMIT_REQUESTS) {
    return true
  }
  
  record.count++
  return false
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:;"
  )
  
  // CORS headers for API routes
  if (response.url.includes('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', env.NEXT_PUBLIC_APP_URL)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Max-Age', '86400')
  }
  
  return response
}

export function middleware(request: NextRequest) {
  // Skip middleware for static files
  if (
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/favicon.ico') ||
    request.nextUrl.pathname.startsWith('/uploads/')
  ) {
    return NextResponse.next()
  }
  
  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const rateLimitKey = getRateLimitKey(request)
    
    if (isRateLimited(rateLimitKey)) {
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded' 
        }),
        { 
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })
    return addSecurityHeaders(response)
  }
  
  // Continue with request
  const response = NextResponse.next()
  return addSecurityHeaders(response)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

// src/lib/security/encryption.ts
import crypto from 'crypto'
import { env } from '@/lib/config/environment'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16

  private key: Buffer
  
  constructor(secretKey?: string) {
    const keyString = secretKey || env.ENCRYPTION_KEY || 'default-dev-key-change-in-production!'
    this.key = crypto.scryptSync(keyString, 'salt', KEY_LENGTH)
  }
  
  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(IV_LENGTH)
      const cipher = crypto.createCipher(ALGORITHM, this.key)
      cipher.setAAD(Buffer.from('acttalk', 'utf8'))
      
      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const tag = cipher.getAuthTag()
      
      // Combine iv + tag + encrypted
      return iv.toString('hex') + tag.toString('hex') + encrypted
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Encryption failed')
    }
  }
  
  decrypt(encryptedData: string): string {
    try {
      const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex')
      const tag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex')
      const encrypted = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2)
      
      const decipher = crypto.createDecipher(ALGORITHM, this.key)
      decipher.setAuthTag(tag)
      decipher.setAAD(Buffer.from('acttalk', 'utf8'))
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Decryption failed')
    }
  }
  
  generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }
  
  generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }
  
  generatePinCode(): string {
    // Generate cryptographically secure 4-digit PIN
    let pin: string
    do {
      const randomBytes = crypto.randomBytes(2)
      const randomNumber = randomBytes.readUInt16BE(0)
      pin = String(randomNumber % 10000).padStart(4, '0')
    } while (pin === '0000') // Avoid 0000
    
    return pin
  }
}


// src/lib/security/validation.ts
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

// Input sanitization
export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  }).trim()
}

export function sanitizeMessage(message: string): string {
  // Allow basic formatting but remove scripts
  return DOMPurify.sanitize(message, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code'],
    ALLOWED_ATTR: []
  }).trim()
}

// Validation schemas with sanitization
export const sanitizedUsernameSchema = z.string()
  .transform(sanitizeInput)
  .pipe(z.string()
    .min(2, 'Username must be at least 2 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens')
    .refine(val => !val.startsWith('_'), 'Username cannot start with underscore')
    .refine(val => !val.endsWith('_'), 'Username cannot end with underscore')
  )

export const sanitizedMessageSchema = z.string()
  .transform(sanitizeMessage)
  .pipe(z.string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message too long (max 1000 characters)')
    .refine(val => val.trim().length > 0, 'Message cannot be only whitespace')
  )

export const pinCodeSchema = z.string()
  .transform(sanitizeInput)
  .pipe(z.string()
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'PIN must contain only numbers')
    .refine(val => val !== '0000', 'PIN cannot be 0000')
    .refine(val => !['1234', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'].includes(val), 'PIN too simple')
  )

// File validation
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > env.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large (max ${Math.round(env.MAX_FILE_SIZE / 1024 / 1024)}MB)`
    }
  }
  
  if (!env.ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${env.ALLOWED_FILE_TYPES.join(', ')}`
    }
  }
  
  return { valid: true }
}

// Rate limiting
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map()
  
  constructor(
    private maxAttempts: number,
    private windowMs: number
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const userAttempts = this.attempts.get(identifier) || []
    
    // Remove old attempts outside the window
    const validAttempts = userAttempts.filter(
      timestamp => now - timestamp < this.windowMs
    )
    
    if (validAttempts.length >= this.maxAttempts) {
      return false
    }
    
    // Add current attempt
    validAttempts.push(now)
    this.attempts.set(identifier, validAttempts)
    
    return true
  }
  
  getRemainingTime(identifier: string): number {
    const userAttempts = this.attempts.get(identifier) || []
    if (userAttempts.length === 0) return 0
    
    const oldestAttempt = Math.min(...userAttempts)
    const resetTime = oldestAttempt + this.windowMs
    const now = Date.now()
    
    return Math.max(0, resetTime - now)
  }
  
  reset(identifier: string): void {
    this.attempts.delete(identifier)
  }
}

// Global rate limiters
export const messageRateLimiter = new RateLimiter(10, 60 * 1000) // 10 messages per minute
export const roomCreationRateLimiter = new RateLimiter(3, 60 * 60 * 1000) // 3 rooms per hour
export const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000) // 5 auth attempts per 15 minutes

// src/types/api.ts
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: any
}

export interface ApiError {
  code: string
  message: string
  details?: any
  statusCode?: number
}

export interface AuthResponse {
  user: {
    id: string
    username: string
    matrixUserId: string
    createdAt: string
  }
  auth: {
    userId: string
    accessToken: string
    deviceId: string
  }
}

export interface RoomResponse {
  room: {
    id: string
    name: string
    pinCode: string
    expiresAt: string
    matrixRoomId: string
    encrypted: boolean
    participants: Array<{
      id: string
      username: string
      joinedAt: string
      isOnline: boolean
    }>
  }
  session?: {
    roomId: string
    userId: string
    username: string
    joinedAt: string
    expiresAt: string
  }
}

export interface MessageResponse {
  message: {
    id: string
    content: string
    senderId: string
    senderName: string
    timestamp: string
    type: 'text' | 'image'
    encrypted: boolean
    imageUrl?: string
  }
}

export interface UploadResponse {
  url: string
  filename: string
  size: number
  type: string
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  services: {
    matrix: 'connected' | 'disconnected'
    database: 'healthy' | 'unhealthy'
    websocket: 'healthy' | 'unhealthy'
  }
  version: string
}

// Environment files
// .env.local
/*
# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Matrix Configuration
NEXT_PUBLIC_MATRIX_HOMESERVER=https://matrix.org
NEXT_PUBLIC_MATRIX_SERVER_NAME=matrix.org

# Security (generate strong keys for production)
JWT_SECRET=your-jwt-secret-key-change-in-production
ENCRYPTION_KEY=your-encryption-key-change-in-production

# File Upload
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp
UPLOAD_DIR=public/uploads

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=900000

# Session Management
SESSION_TIMEOUT=3600000
ROOM_TIMEOUT=3600000
*/

// .env.production
/*
# Production Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com
NEXT_PUBLIC_WS_URL=wss://your-domain.com

# Matrix Configuration
NEXT_PUBLIC_MATRIX_HOMESERVER=https://matrix.your-domain.com
NEXT_PUBLIC_MATRIX_SERVER_NAME=your-domain.com

# Production Security Keys (generate strong keys)
JWT_SECRET=super-strong-jwt-secret-for-production
ENCRYPTION_KEY=super-strong-encryption-key-for-production

# Stricter Rate Limiting
RATE_LIMIT_REQUESTS=50
RATE_LIMIT_WINDOW=900000
*/