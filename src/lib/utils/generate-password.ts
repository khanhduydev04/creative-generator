import crypto from 'crypto'

const CHARSET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*'

export function generatePassword(length = 16): string {
  const bytes = crypto.randomBytes(length)
  return Array.from(bytes)
    .map(b => CHARSET[b % CHARSET.length])
    .join('')
}
