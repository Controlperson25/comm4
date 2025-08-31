// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { memoryStore } from '@/lib/storage'

export async function GET() {
  try {
    const now = new Date()
    const stats = memoryStore.getStats()
    
    // Проверка состояния системы
    const healthChecks = {
      memory: checkMemoryHealth(),
      storage: checkStorageHealth(stats),
      uptime: process.uptime()
    }
    
    const isHealthy = Object.values(healthChecks).every(check => 
      typeof check === 'number' || check.status === 'ok'
    )
    
    return NextResponse.json({
      success: true,
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: now.toISOString(),
      services: {
        api: 'ok',
        memory: healthChecks.memory.status,
        storage: healthChecks.storage.status,
        websocket: 'pending', // TODO: реальная проверка WebSocket
        matrix: 'pending' // TODO: реальная проверка Matrix
      },
      stats: {
        ...stats,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        uptime: Math.round(healthChecks.uptime),
        version: process.env.npm_package_version || '1.0.0',
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      },
      healthChecks
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Internal server error',
        services: {
          api: 'error',
          memory: 'error',
          storage: 'error',
          websocket: 'unknown',
          matrix: 'unknown'
        }
      },
      { status: 500 }
    )
  }
}

function checkMemoryHealth(): { status: 'ok' | 'warning' | 'critical'; details: any } {
  const memUsage = process.memoryUsage()
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024
  const usagePercent = (heapUsedMB / heapTotalMB) * 100
  
  let status: 'ok' | 'warning' | 'critical' = 'ok'
  if (usagePercent > 90) status = 'critical'
  else if (usagePercent > 75) status = 'warning'
  
  return {
    status,
    details: {
      heapUsed: Math.round(heapUsedMB),
      heapTotal: Math.round(heapTotalMB),
      usagePercent: Math.round(usagePercent),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024)
    }
  }
}

function checkStorageHealth(stats: any): { status: 'ok' | 'warning' | 'critical'; details: any } {
  let status: 'ok' | 'warning' | 'critical' = 'ok'
  
  // Проверим количество активных объектов
  if (stats.activeRooms > 100) status = 'warning'
  if (stats.activeRooms > 500) status = 'critical'
  
  if (stats.activeSessions > 1000) status = 'warning'
  if (stats.activeSessions > 5000) status = 'critical'
  
  return {
    status,
    details: {
      rooms: stats.rooms,
      activeRooms: stats.activeRooms,
      messages: stats.messages,
      sessions: stats.sessions,
      activeSessions: stats.activeSessions,
      roomsToSessionsRatio: stats.sessions > 0 ? (stats.rooms / stats.sessions) : 0
    }
  }
}