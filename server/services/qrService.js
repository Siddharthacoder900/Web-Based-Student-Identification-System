import { createHash, randomBytes } from 'node:crypto'
import { config } from '../config/env.js'

export function createQrToken() {
  const token = randomBytes(32).toString('base64url')
  return {
    token,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    verificationUrl: new URL(`/verify/${token}`, config.publicAppUrl).toString(),
  }
}

export function hashQrToken(token) {
  return createHash('sha256').update(token).digest('hex')
}
