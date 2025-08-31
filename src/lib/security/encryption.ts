// Полностью удалите все содержимое и вставьте это:

export class EncryptionService {
  constructor(secretKey?: string) {
    // Простая инициализация без crypto
  }
  
  generatePinCode(): string {
    let pin: string
    do {
      pin = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    } while (pin === '0000')
    
    return pin
  }
  
  generateHash(data: string): string {
    // Простой hash для dev-режима
    return btoa(data).replace(/=/g, '').slice(0, 32)
  }
  
  generateRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}

export const encryptionService = new EncryptionService()