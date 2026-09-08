import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from 'crypto'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const hashBuf = Buffer.from(hash, 'hex')
  const testBuf = scryptSync(password, salt, 64)
  if (hashBuf.length !== testBuf.length) return false
  return timingSafeEqual(hashBuf, testBuf)
}

// Simple session token: base64 of userId:role:random
const SESSION_SECRET = process.env.NEXTAUTH_SECRET ?? 'lash-erp-secret-2026'

export function createSessionToken(user: { id: string; role: string }): string {
  const payload = `${user.id}:${user.role}:${randomUUID()}`
  return Buffer.from(payload).toString('base64')
}

export function parseSessionToken(token: string): { userId: string; role: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const [userId, role] = decoded.split(':')
    if (!userId || !role) return null
    return { userId, role }
  } catch {
    return null
  }
}

export const SESSION_COOKIE = 'bella_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
