import { NextRequest, NextResponse } from 'next/server'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

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
      resetTime: now + 15 * 60 * 1000 // 15 minutes
    }
    return false
  }
  
  if (record.count >= 100) { // 100 requests per 15 minutes
    return true
  }
  
  record.count++
  return false
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
  
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}