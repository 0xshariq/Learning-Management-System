import crypto from 'crypto'
import jwt from 'jsonwebtoken'

export interface StreamCredentials {
  streamId: string
  streamKey: string
  chatSecret: string
}

export interface JWTPayload {
  streamId: string
  userId: string
  role: 'teacher' | 'student'
  permissions: string[]
  iat?: number
  exp?: number
}

export function generateStreamCredentials(): StreamCredentials {
  // Generate unique identifiers for each live class
  const timestamp = Date.now()
  const randomId = crypto.randomBytes(8).toString('hex')
  
  return {
    streamId: `${process.env.ZENSTREAM_STREAM_ID}-${timestamp}-${randomId}`,
    streamKey: process.env.ZENSTREAM_STREAM_KEY || '',
    chatSecret: process.env.ZENSTREAM_CHAT_SECRET || ''
  }
}

export function generateStreamUrls(streamId: string, chatSecret: string) {
  const playerUrl = `${process.env.NEXT_PUBLIC_ZENSTREAM_PLAYER_URL}?liveId=${streamId}&token={GENERATED_JWT_TOKEN}`
  const chatUrl = `${process.env.NEXT_PUBLIC_ZENSTREAM_CHAT_URL}?liveId=${streamId}&token={GENERATED_JWT_TOKEN}`
  
  return {
    playerUrl,
    chatUrl,
    serverUrl: process.env.ZENSTREAM_SERVER_URL
  }
}

export function generateJWTToken(
  streamId: string, 
  userId: string, 
  role: 'teacher' | 'student'
): string {
  if (!process.env.ZENSTREAM_CHAT_SECRET) {
    throw new Error('ZENSTREAM_CHAT_SECRET environment variable is not set')
  }

  // Define permissions based on role
  const permissions = role === 'teacher' 
    ? ['stream', 'chat', 'moderate', 'control'] 
    : ['view', 'chat']

  const payload: JWTPayload = {
    streamId,
    userId,
    role,
    permissions,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (4 * 60 * 60) // 4 hours expiration
  }

  const options: jwt.SignOptions = {
    algorithm: 'HS256',
    issuer: 'edulearn-lms',
    audience: 'zenstream-service'
  }

  try {
    return jwt.sign(payload, process.env.ZENSTREAM_CHAT_SECRET, options)
  } catch (error) {
    console.error('Error generating JWT token:', error)
    throw new Error('Failed to generate JWT token')
  }
}

export function verifyJWTToken(token: string): JWTPayload | null {
  if (!process.env.ZENSTREAM_CHAT_SECRET) {
    throw new Error('ZENSTREAM_CHAT_SECRET environment variable is not set')
  }

  try {
    const decoded = jwt.verify(token, process.env.ZENSTREAM_CHAT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'edulearn-lms',
      audience: 'zenstream-service'
    }) as JWTPayload

    return decoded
  } catch (error) {
    console.error('Error verifying JWT token:', error)
    return null
  }
}

export function refreshJWTToken(token: string): string | null {
  const decoded = verifyJWTToken(token)
  
  if (!decoded) {
    return null
  }

  // Check if token is close to expiration (within 30 minutes)
  const currentTime = Math.floor(Date.now() / 1000)
  const timeUntilExpiry = (decoded.exp || 0) - currentTime
  
  if (timeUntilExpiry > 30 * 60) {
    // Token still has more than 30 minutes, no need to refresh
    return token
  }

  // Generate new token with same payload but extended expiration
  return generateJWTToken(decoded.streamId, decoded.userId, decoded.role)
}

export function getTokenExpiryTime(token: string): Date | null {
  const decoded = verifyJWTToken(token)
  if (!decoded || !decoded.exp) {
    return null
  }
  
  return new Date(decoded.exp * 1000)
}

export function isTokenExpired(token: string): boolean {
  const decoded = verifyJWTToken(token)
  if (!decoded || !decoded.exp) {
    return true
  }
  
  const currentTime = Math.floor(Date.now() / 1000)
  return decoded.exp < currentTime
}

export function getTokenTimeRemaining(token: string): number {
  const decoded = verifyJWTToken(token)
  if (!decoded || !decoded.exp) {
    return 0
  }
  
  const currentTime = Math.floor(Date.now() / 1000)
  return Math.max(0, decoded.exp - currentTime)
}
