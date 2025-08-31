// src/hooks/useTimer.ts
import { useState, useEffect, useCallback } from 'react'

interface UseTimerOptions {
  onExpire?: () => void
  warningThreshold?: number // seconds before expiry to show warning
  onWarning?: () => void
}

interface TimerState {
  timeLeft: number
  isExpired: boolean
  isWarning: boolean
  formattedTime: string
}

export function useTimer(expiresAt: Date, options: UseTimerOptions = {}): TimerState {
  const { onExpire, warningThreshold = 300, onWarning } = options // 5 minutes default warning
  
  const [timeLeft, setTimeLeft] = useState(0)
  const [isExpired, setIsExpired] = useState(false)
  const [isWarning, setIsWarning] = useState(false)
  const [hasTriggeredWarning, setHasTriggeredWarning] = useState(false)

  const formatTime = useCallback((seconds: number): string => {
    if (seconds <= 0) return '00:00'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
      
      setTimeLeft(diff)
      
      // Check if expired
      if (diff <= 0 && !isExpired) {
        setIsExpired(true)
        onExpire?.()
        return
      }
      
      // Check for warning
      if (diff <= warningThreshold && diff > 0 && !hasTriggeredWarning) {
        setIsWarning(true)
        setHasTriggeredWarning(true)
        onWarning?.()
      }
    }

    // Initial update
    updateTimer()
    
    // Set up interval
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [expiresAt, onExpire, onWarning, warningThreshold, isExpired, hasTriggeredWarning])

  return {
    timeLeft,
    isExpired,
    isWarning,
    formattedTime: formatTime(timeLeft)
  }
}

// Simple countdown hook
export function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [isActive, setIsActive] = useState(false)

  const start = useCallback(() => setIsActive(true), [])
  const pause = useCallback(() => setIsActive(false), [])
  const reset = useCallback(() => {
    setSeconds(initialSeconds)
    setIsActive(false)
  }, [initialSeconds])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds(seconds => {
          if (seconds <= 1) {
            setIsActive(false)
            return 0
          }
          return seconds - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, seconds])

  return {
    seconds,
    isActive,
    start,
    pause,
    reset,
    formattedTime: `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
  }
}