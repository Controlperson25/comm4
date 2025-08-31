// src/hooks/useLocalStorage.ts
import { useState, useEffect, useCallback, useRef } from 'react'

interface UseLocalStorageOptions<T> {
  serialize?: (value: T) => string
  deserialize?: (value: string) => T
  defaultValue?: T
  syncAcrossTabs?: boolean
  onError?: (error: Error, action: 'get' | 'set' | 'remove') => void
}

interface UseLocalStorageReturn<T> {
  value: T
  setValue: (value: T | ((prev: T) => T)) => boolean
  removeValue: () => boolean
  refresh: () => void
  isLoading: boolean
  error: Error | null
}

function isClient(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function useLocalStorage<T>(
  key: string,
  options: UseLocalStorageOptions<T> = {}
): UseLocalStorageReturn<T> {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    defaultValue,
    syncAcrossTabs = true,
    onError
  } = options

  const [value, setInternalValue] = useState<T>(() => {
    if (!isClient()) {
      return defaultValue as T
    }
    
    try {
      const item = localStorage.getItem(key)
      return item ? deserialize(item) : (defaultValue as T)
    } catch (error) {
      onError?.(error as Error, 'get')
      return defaultValue as T
    }
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const storageKeyRef = useRef(key)

  // Update key reference
  useEffect(() => {
    storageKeyRef.current = key
  }, [key])

  // Read value from localStorage
  const readValue = useCallback((): T => {
    if (!isClient()) {
      return defaultValue as T
    }

    try {
      setError(null)
      const item = localStorage.getItem(storageKeyRef.current)
      return item ? deserialize(item) : (defaultValue as T)
    } catch (error) {
      const err = error as Error
      setError(err)
      onError?.(err, 'get')
      return defaultValue as T
    }
  }, [defaultValue, deserialize, onError])

  // Write value to localStorage
  const writeValue = useCallback((valueToStore: T): boolean => {
    if (!isClient()) {
      return false
    }

    try {
      setError(null)
      const serializedValue = serialize(valueToStore)
      localStorage.setItem(storageKeyRef.current, serializedValue)
      
      // Dispatch custom event for cross-tab sync
      if (syncAcrossTabs) {
        window.dispatchEvent(new StorageEvent('storage', {
          key: storageKeyRef.current,
          newValue: serializedValue,
          oldValue: localStorage.getItem(storageKeyRef.current),
          storageArea: localStorage,
          url: window.location.href
        }))
      }
      
      return true
    } catch (error) {
      const err = error as Error
      setError(err)
      onError?.(err, 'set')
      return false
    }
  }, [serialize, syncAcrossTabs, onError])

  // Remove value from localStorage
  const removeValue = useCallback((): boolean => {
    if (!isClient()) {
      return false
    }

    try {
      setError(null)
      const oldValue = localStorage.getItem(storageKeyRef.current)
      localStorage.removeItem(storageKeyRef.current)
      
      // Dispatch custom event for cross-tab sync
      if (syncAcrossTabs) {
        window.dispatchEvent(new StorageEvent('storage', {
          key: storageKeyRef.current,
          newValue: null,
          oldValue,
          storageArea: localStorage,
          url: window.location.href
        }))
      }
      
      setInternalValue(defaultValue as T)
      return true
    } catch (error) {
      const err = error as Error
      setError(err)
      onError?.(err, 'remove')
      return false
    }
  }, [defaultValue, syncAcrossTabs, onError])

  // Set value with support for functional updates
  const setValue = useCallback((newValue: T | ((prev: T) => T)): boolean => {
    setIsLoading(true)
    
    try {
      const valueToStore = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(value)
        : newValue
      
      const success = writeValue(valueToStore)
      if (success) {
        setInternalValue(valueToStore)
      }
      
      setIsLoading(false)
      return success
    } catch (error) {
      setIsLoading(false)
      const err = error as Error
      setError(err)
      onError?.(err, 'set')
      return false
    }
  }, [value, writeValue, onError])

  // Refresh value from localStorage
  const refresh = useCallback(() => {
    setIsLoading(true)
    const newValue = readValue()
    setInternalValue(newValue)
    setIsLoading(false)
  }, [readValue])

  // Listen for storage changes (cross-tab sync)
  useEffect(() => {
    if (!isClient() || !syncAcrossTabs) {
      return
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKeyRef.current && e.storageArea === localStorage) {
        try {
          if (e.newValue === null) {
            setInternalValue(defaultValue as T)
          } else {
            const newValue = deserialize(e.newValue)
            setInternalValue(newValue)
          }
          setError(null)
        } catch (error) {
          const err = error as Error
          setError(err)
          onError?.(err, 'get')
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [defaultValue, deserialize, syncAcrossTabs, onError])

  // Initialize value from localStorage on mount
  useEffect(() => {
    if (isClient()) {
      refresh()
    }
  }, [refresh])

  return {
    value,
    setValue,
    removeValue,
    refresh,
    isLoading,
    error
  }
}

// Specialized hooks for common use cases
export function useLocalStorageString(
  key: string,
  defaultValue: string = '',
  options?: Omit<UseLocalStorageOptions<string>, 'serialize' | 'deserialize'>
): UseLocalStorageReturn<string> {
  return useLocalStorage(key, {
    ...options,
    defaultValue,
    serialize: (value: string) => value,
    deserialize: (value: string) => value
  })
}

export function useLocalStorageNumber(
  key: string,
  defaultValue: number = 0,
  options?: Omit<UseLocalStorageOptions<number>, 'serialize' | 'deserialize'>
): UseLocalStorageReturn<number> {
  return useLocalStorage(key, {
    ...options,
    defaultValue,
    serialize: (value: number) => value.toString(),
    deserialize: (value: string) => {
      const parsed = parseFloat(value)
      return isNaN(parsed) ? defaultValue : parsed
    }
  })
}

export function useLocalStorageBoolean(
  key: string,
  defaultValue: boolean = false,
  options?: Omit<UseLocalStorageOptions<boolean>, 'serialize' | 'deserialize'>
): UseLocalStorageReturn<boolean> {
  return useLocalStorage(key, {
    ...options,
    defaultValue,
    serialize: (value: boolean) => value.toString(),
    deserialize: (value: string) => value === 'true'
  })
}

export function useLocalStorageArray<T>(
  key: string,
  defaultValue: T[] = [],
  options?: Omit<UseLocalStorageOptions<T[]>, 'defaultValue'>
): UseLocalStorageReturn<T[]> {
  return useLocalStorage(key, {
    ...options,
    defaultValue
  })
}

export function useLocalStorageObject<T extends Record<string, any>>(
  key: string,
  defaultValue: T,
  options?: Omit<UseLocalStorageOptions<T>, 'defaultValue'>
): UseLocalStorageReturn<T> {
  return useLocalStorage(key, {
    ...options,
    defaultValue
  })
}

// Utility functions for direct localStorage operations
export const localStorageUtils = {
  // Check if localStorage is available
  isAvailable: (): boolean => {
    try {
      if (!isClient()) return false
      const test = '__localStorage_test__'
      localStorage.setItem(test, 'test')
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  },

  // Get all keys from localStorage
  getAllKeys: (): string[] => {
    if (!isClient()) return []
    return Object.keys(localStorage)
  },

  // Get storage size
  getStorageSize: (): number => {
    if (!isClient()) return 0
    let total = 0
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length
      }
    }
    return total
  },

  // Clear all localStorage data
  clearAll: (): boolean => {
    if (!isClient()) return false
    try {
      localStorage.clear()
      return true
    } catch {
      return false
    }
  },

  // Clear localStorage data by prefix
  clearByPrefix: (prefix: string): boolean => {
    if (!isClient()) return false
    try {
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith(prefix)
      )
      keysToRemove.forEach(key => localStorage.removeItem(key))
      return true
    } catch {
      return false
    }
  },

  // Export localStorage data
  exportData: (): Record<string, string> | null => {
    if (!isClient()) return null
    try {
      const data: Record<string, string> = {}
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          data[key] = localStorage[key]
        }
      }
      return data
    } catch {
      return null
    }
  },

  // Import localStorage data
  importData: (data: Record<string, string>): boolean => {
    if (!isClient()) return false
    try {
      Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(key, value)
      })
      return true
    } catch {
      return false
    }
  }
}