import crypto from 'crypto'
import jwt from 'jsonwebtoken'

export interface StreamCredentials {
  streamId: string
  streamKey: string
  chatSecret: string
  rtmpUrl?: string
  hlsUrl?: string
  webRtcUrl?: string
}

export interface JWTPayload {
  streamId: string
  userId: string
  role: 'teacher' | 'student' | 'admin'
  permissions: string[]
  sessionId: string
  deviceId?: string
  ipAddress?: string
  iat?: number
  exp?: number
  nbf?: number
}

export interface StreamAnalytics {
  streamId: string
  viewerCount: number
  peakViewers: number
  averageWatchTime: number
  chatMessages: number
  qualitySwitches: number
  bufferingEvents: number
  errors: number
  startedAt: Date
  endedAt?: Date
}

export interface StreamQuality {
  label: string
  value: string
  bitrate: number
  resolution: string
  framerate: number
}

export interface StreamConfig {
  maxViewers: number
  recordingEnabled: boolean
  chatEnabled: boolean
  qualityOptions: StreamQuality[]
  adaptiveBitrate: boolean
  lowLatency: boolean
  backupStream: boolean
}

export class ZenStreamService {
  private static instance: ZenStreamService
  private analytics: Map<string, StreamAnalytics> = new Map()
  private rateLimitCache: Map<string, { count: number; resetTime: number }> = new Map()
  private activeSessions: Map<string, Set<string>> = new Map()

  private constructor() {}

  static getInstance(): ZenStreamService {
    if (!ZenStreamService.instance) {
      ZenStreamService.instance = new ZenStreamService()
    }
    return ZenStreamService.instance
  }

  generateStreamCredentials(config?: Partial<StreamConfig>): StreamCredentials {
    const timestamp = Date.now()
    const randomId = crypto.randomBytes(12).toString('hex')
    const streamId = `${process.env.ZENSTREAM_STREAM_ID || 'edulearn'}-${timestamp}-${randomId}`
    
    // Generate cryptographically secure stream key
    const streamKey = crypto.randomBytes(32).toString('base64url')
    
    // Generate chat secret with higher entropy
    const chatSecret = crypto.randomBytes(64).toString('base64url')
    
    const credentials: StreamCredentials = {
      streamId,
      streamKey,
      chatSecret,
      rtmpUrl: `${process.env.ZENSTREAM_RTMP_URL || 'rtmp://localhost/live'}/${streamKey}`,
      hlsUrl: `${process.env.ZENSTREAM_HLS_URL || 'https://stream.example.com'}/${streamId}/playlist.m3u8`,
      webRtcUrl: `${process.env.ZENSTREAM_WEBRTC_URL || 'wss://stream.example.com'}/${streamId}`
    }

    // Initialize analytics for this stream
    this.analytics.set(streamId, {
      streamId,
      viewerCount: 0,
      peakViewers: 0,
      averageWatchTime: 0,
      chatMessages: 0,
      qualitySwitches: 0,
      bufferingEvents: 0,
      errors: 0,
      startedAt: new Date()
    })

    return credentials
  }

  generateStreamUrls(streamId: string, token: string) {
    const baseUrl = process.env.NEXT_PUBLIC_ZENSTREAM_BASE_URL || 'https://stream.example.com'
    
    return {
      playerUrl: `${baseUrl}/player?liveId=${streamId}&token=${token}`,
      chatUrl: `${baseUrl}/chat?liveId=${streamId}&token=${token}`,
      serverUrl: process.env.ZENSTREAM_SERVER_URL,
      webRtcUrl: `${baseUrl}/webrtc?liveId=${streamId}&token=${token}`,
      recordingUrl: `${baseUrl}/recording?liveId=${streamId}&token=${token}`
    }
  }

  generateJWTToken(
    streamId: string, 
    userId: string, 
    role: 'teacher' | 'student' | 'admin',
    options?: {
      sessionId?: string
      deviceId?: string
      ipAddress?: string
      customPermissions?: string[]
      expiresIn?: number
    }
  ): string {
    if (!process.env.ZENSTREAM_CHAT_SECRET) {
      throw new Error('ZENSTREAM_CHAT_SECRET environment variable is not set')
    }

    // Rate limiting check
    const rateLimitKey = `${userId}:${streamId}`
    if (!this.checkRateLimit(rateLimitKey)) {
      throw new Error('Rate limit exceeded. Please wait before requesting another token.')
    }

    // Define permissions based on role with enhanced security
    const basePermissions = role === 'teacher' 
      ? ['stream', 'chat', 'moderate', 'control', 'record', 'analytics'] 
      : role === 'admin'
      ? ['stream', 'chat', 'moderate', 'control', 'record', 'analytics', 'admin']
      : ['view', 'chat']

    const permissions = options?.customPermissions || basePermissions

    const sessionId = options?.sessionId || crypto.randomBytes(16).toString('hex')
    const expiresIn = options?.expiresIn || (4 * 60 * 60) // 4 hours default

    const payload: JWTPayload = {
      streamId,
      userId,
      role,
      permissions,
      sessionId,
      deviceId: options?.deviceId,
      ipAddress: options?.ipAddress,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresIn,
      nbf: Math.floor(Date.now() / 1000) // Not valid before now
    }

    const jwtOptions: jwt.SignOptions = {
      algorithm: 'HS256',
      issuer: 'edulearn-lms',
      audience: 'zenstream-service',
      jwtid: sessionId, // Unique JWT ID
      subject: userId
    }

    try {
      const token = jwt.sign(payload, process.env.ZENSTREAM_CHAT_SECRET, jwtOptions)
      
      // Track active session
      this.trackActiveSession(streamId, sessionId, userId, role)
      
      return token
    } catch (error) {
      console.error('Error generating JWT token:', error)
      throw new Error('Failed to generate JWT token')
    }
  }

  verifyJWTToken(token: string, options?: {
    checkExpiry?: boolean
    validatePermissions?: string[]
  }): JWTPayload | null {
    if (!process.env.ZENSTREAM_CHAT_SECRET) {
      throw new Error('ZENSTREAM_CHAT_SECRET environment variable is not set')
    }

    try {
      const decoded = jwt.verify(token, process.env.ZENSTREAM_CHAT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'edulearn-lms',
        audience: 'zenstream-service'
      }) as JWTPayload

      // Check if token is expired
      if (options?.checkExpiry !== false) {
        const currentTime = Math.floor(Date.now() / 1000)
        if (decoded.exp && decoded.exp < currentTime) {
          return null
        }
      }

      // Validate permissions if required
      if (options?.validatePermissions) {
        const hasPermission = options.validatePermissions.some(permission => 
          decoded.permissions.includes(permission)
        )
        if (!hasPermission) {
          return null
        }
      }

      return decoded
    } catch (error) {
      console.error('Error verifying JWT token:', error)
      return null
    }
  }

  refreshJWTToken(token: string, options?: {
    extendBy?: number
    validateSession?: boolean
  }): string | null {
    const decoded = this.verifyJWTToken(token, { checkExpiry: false })
    
    if (!decoded) {
      return null
    }

    // Validate session if required
    if (options?.validateSession !== false) {
      if (!this.isSessionActive(decoded.streamId, decoded.sessionId)) {
        return null
      }
    }

    // Check if token is close to expiration (within 30 minutes)
    const currentTime = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = (decoded.exp || 0) - currentTime
    const extendBy = options?.extendBy || (4 * 60 * 60) // 4 hours default
    
    if (timeUntilExpiry > 30 * 60) {
      // Token still has more than 30 minutes, no need to refresh
      return token
    }

    // Generate new token with extended expiration
    return this.generateJWTToken(decoded.streamId, decoded.userId, decoded.role, {
      sessionId: decoded.sessionId,
      deviceId: decoded.deviceId,
      ipAddress: decoded.ipAddress,
      expiresIn: extendBy
    })
  }

  getTokenExpiryTime(token: string): Date | null {
    const decoded = this.verifyJWTToken(token, { checkExpiry: false })
    if (!decoded || !decoded.exp) {
      return null
    }
    
    return new Date(decoded.exp * 1000)
  }

  isTokenExpired(token: string): boolean {
    const decoded = this.verifyJWTToken(token, { checkExpiry: false })
    if (!decoded || !decoded.exp) {
      return true
    }
    
    const currentTime = Math.floor(Date.now() / 1000)
    return decoded.exp < currentTime
  }

  getTokenTimeRemaining(token: string): number {
    const decoded = this.verifyJWTToken(token, { checkExpiry: false })
    if (!decoded || !decoded.exp) {
      return 0
    }
    
    const currentTime = Math.floor(Date.now() / 1000)
    return Math.max(0, decoded.exp - currentTime)
  }

  revokeToken(token: string): boolean {
    const decoded = this.verifyJWTToken(token, { checkExpiry: false })
    if (!decoded) {
      return false
    }

    // Remove from active sessions
    this.removeActiveSession(decoded.streamId, decoded.sessionId)
    return true
  }

  getStreamAnalytics(streamId: string): StreamAnalytics | null {
    return this.analytics.get(streamId) || null
  }

  updateStreamAnalytics(streamId: string, updates: Partial<StreamAnalytics>): void {
    const analytics = this.analytics.get(streamId)
    if (analytics) {
      Object.assign(analytics, updates)
      this.analytics.set(streamId, analytics)
    }
  }

  incrementViewerCount(streamId: string): void {
    const analytics = this.analytics.get(streamId)
    if (analytics) {
      analytics.viewerCount++
      if (analytics.viewerCount > analytics.peakViewers) {
        analytics.peakViewers = analytics.viewerCount
      }
      this.analytics.set(streamId, analytics)
    }
  }

  decrementViewerCount(streamId: string): void {
    const analytics = this.analytics.get(streamId)
    if (analytics && analytics.viewerCount > 0) {
      analytics.viewerCount--
      this.analytics.set(streamId, analytics)
    }
  }

  private checkRateLimit(key: string, limit: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now()
    const record = this.rateLimitCache.get(key)
    
    if (!record || now > record.resetTime) {
      this.rateLimitCache.set(key, { count: 1, resetTime: now + windowMs })
      return true
    }
    
    if (record.count >= limit) {
      return false
    }
    
    record.count++
    this.rateLimitCache.set(key, record)
    return true
  }

  private trackActiveSession(streamId: string, sessionId: string, userId: string, role: string): void {
    if (!this.activeSessions.has(streamId)) {
      this.activeSessions.set(streamId, new Set())
    }
    this.activeSessions.get(streamId)?.add(sessionId)
  }

  private removeActiveSession(streamId: string, sessionId: string): void {
    this.activeSessions.get(streamId)?.delete(sessionId)
  }

  private isSessionActive(streamId: string, sessionId: string): boolean {
    return this.activeSessions.get(streamId)?.has(sessionId) || false
  }

  getActiveSessionsCount(streamId: string): number {
    return this.activeSessions.get(streamId)?.size || 0
  }

  cleanupExpiredSessions(): void {
    const now = Date.now()
    
    // Clean up rate limit cache
    for (const [key, record] of this.rateLimitCache.entries()) {
      if (now > record.resetTime) {
        this.rateLimitCache.delete(key)
      }
    }
  }

  // Utility functions for backward compatibility
  static generateStreamCredentials(): StreamCredentials {
    return ZenStreamService.getInstance().generateStreamCredentials()
  }

  static generateStreamUrls(streamId: string) {
    const token = '{GENERATED_JWT_TOKEN}' // Placeholder
    return ZenStreamService.getInstance().generateStreamUrls(streamId, token)
  }

  static generateJWTToken(
    streamId: string, 
    userId: string, 
    role: 'teacher' | 'student' | 'admin'
  ): string {
    return ZenStreamService.getInstance().generateJWTToken(streamId, userId, role)
  }

  static verifyJWTToken(token: string): JWTPayload | null {
    return ZenStreamService.getInstance().verifyJWTToken(token)
  }

  static refreshJWTToken(token: string): string | null {
    return ZenStreamService.getInstance().refreshJWTToken(token)
  }

  static getTokenExpiryTime(token: string): Date | null {
    return ZenStreamService.getInstance().getTokenExpiryTime(token)
  }

  static isTokenExpired(token: string): boolean {
    return ZenStreamService.getInstance().isTokenExpired(token)
  }

  static getTokenTimeRemaining(token: string): number {
    return ZenStreamService.getInstance().getTokenTimeRemaining(token)
  }
}

// Export singleton instance for easy access
export const zenStreamService = ZenStreamService.getInstance()
