import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'

export interface StreamConfig {
  inputUrl: string
  outputPath: string
  streamKey: string
  quality: 'low' | 'medium' | 'high' | 'adaptive' | 'ultra'
  bitrate?: number
  resolution?: string
  framerate?: number
  audioBitrate?: number
  audioChannels?: number
  audioSampleRate?: number
}

export interface HLSConfig {
  segmentDuration: number
  playlistLength: number
  targetDuration: number
  maxSegmentDuration: number
  lowLatency: boolean
  enableDateRange: boolean
  enableEmsg: boolean
  enableID3: boolean
}

export interface WebRTCConfig {
  enabled: boolean
  iceServers: RTCIceServer[]
  maxBitrate: number
  enableSimulcast: boolean
  enableSvc: boolean
}

export interface RecordingConfig {
  enabled: boolean
  format: 'mp4' | 'webm' | 'mkv'
  quality: 'low' | 'medium' | 'high'
  includeAudio: boolean
  maxDuration: number // in seconds
}

export interface StreamInfo {
  streamId: string
  streamKey: string
  hlsUrl: string
  rtmpUrl: string
  webRtcUrl?: string
  status: 'idle' | 'starting' | 'live' | 'ended' | 'error' | 'recording'
  quality: string
  bitrate: number
  resolution: string
  framerate: number
  viewers: number
  startedAt?: Date
  endedAt?: Date
  recordingPath?: string
  errorMessage?: string
  analytics: {
    totalBytes: number
    averageBitrate: number
    peakBitrate: number
    bufferingEvents: number
    qualitySwitches: number
    errors: number
    uptime: number
  }
}

export interface StreamEvent {
  type: 'start' | 'stop' | 'error' | 'quality_change' | 'viewer_join' | 'viewer_leave'
  streamId: string
  timestamp: Date
  data?: any
}

export class VideoStreamingService extends EventEmitter {
  private streams: Map<string, StreamInfo> = new Map()
  private ffmpegProcesses: Map<string, ChildProcess> = new Map()
  private recordingProcesses: Map<string, ChildProcess> = new Map()
  private outputDir: string
  private maxConcurrentStreams: number
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(outputDir: string = './public/streams', maxConcurrentStreams: number = 10) {
    super()
    this.outputDir = outputDir
    this.maxConcurrentStreams = maxConcurrentStreams
    this.ensureOutputDir()
    this.startCleanupInterval()
  }

  private async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true })
    } catch (error) {
      console.error('Error creating output directory:', error)
    }
  }

  private startCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredStreams()
    }, 5 * 60 * 1000) // Clean up every 5 minutes
  }

  private cleanupExpiredStreams() {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    for (const [streamId, stream] of this.streams.entries()) {
      if (stream.endedAt && (now - stream.endedAt.getTime()) > maxAge) {
        this.removeStream(streamId)
      }
    }
  }

  private removeStream(streamId: string) {
    this.streams.delete(streamId)
    this.ffmpegProcesses.delete(streamId)
    this.recordingProcesses.delete(streamId)
  }

  generateStreamCredentials(): { streamId: string; streamKey: string } {
    const timestamp = Date.now()
    const randomId = crypto.randomBytes(12).toString('hex')
    const streamId = `stream-${timestamp}-${randomId}`
    const streamKey = crypto.randomBytes(32).toString('base64url')
    
    return { streamId, streamKey }
  }

  async startStream(config: StreamConfig, options?: {
    hlsConfig?: Partial<HLSConfig>
    webRtcConfig?: Partial<WebRTCConfig>
    recordingConfig?: Partial<RecordingConfig>
  }): Promise<StreamInfo> {
    // Check concurrent stream limit
    const activeStreams = Array.from(this.streams.values()).filter(s => s.status === 'live')
    if (activeStreams.length >= this.maxConcurrentStreams) {
      throw new Error(`Maximum concurrent streams (${this.maxConcurrentStreams}) reached`)
    }

    const { streamId, streamKey } = this.generateStreamCredentials()
    const outputPath = path.join(this.outputDir, streamId)
    
    // Create output directory for this stream
    await fs.mkdir(outputPath, { recursive: true })

    const hlsConfig: HLSConfig = {
      segmentDuration: 4,
      playlistLength: 6,
      targetDuration: 4,
      maxSegmentDuration: 6,
      lowLatency: true,
      enableDateRange: true,
      enableEmsg: true,
      enableID3: true,
      ...options?.hlsConfig
    }

    const streamInfo: StreamInfo = {
      streamId,
      streamKey,
      hlsUrl: `/streams/${streamId}/playlist.m3u8`,
      rtmpUrl: `${process.env.RTMP_SERVER_URL || 'rtmp://localhost/live'}/${streamKey}`,
      webRtcUrl: options?.webRtcConfig?.enabled ? `/webrtc/${streamId}` : undefined,
      status: 'starting',
      quality: config.quality,
      bitrate: config.bitrate || this.getDefaultBitrate(config.quality),
      resolution: config.resolution || this.getDefaultResolution(config.quality),
      framerate: config.framerate || 30,
      viewers: 0,
      startedAt: new Date(),
      analytics: {
        totalBytes: 0,
        averageBitrate: 0,
        peakBitrate: 0,
        bufferingEvents: 0,
        qualitySwitches: 0,
        errors: 0,
        uptime: 0
      }
    }

    this.streams.set(streamId, streamInfo)

    try {
      await this.startFFmpegProcess(streamId, config, hlsConfig, options)
      streamInfo.status = 'live'
      this.streams.set(streamId, streamInfo)
      
      // Start recording if enabled
      if (options?.recordingConfig?.enabled) {
        const recordingConfig: RecordingConfig = {
          enabled: true,
          format: 'mp4',
          quality: 'high',
          includeAudio: true,
          maxDuration: 3600,
          ...options.recordingConfig
        }
        await this.startRecording(streamId, recordingConfig)
      }
      
      this.emit('stream:started', { streamId, streamInfo })
      console.log(`Stream started: ${streamId}`)
      return streamInfo
    } catch (error) {
      streamInfo.status = 'error'
      streamInfo.errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.streams.set(streamId, streamInfo)
      this.emit('stream:error', { streamId, error })
      throw error
    }
  }

  private async startFFmpegProcess(
    streamId: string, 
    config: StreamConfig, 
    hlsConfig: HLSConfig,
    options?: {
      webRtcConfig?: Partial<WebRTCConfig>
      recordingConfig?: Partial<RecordingConfig>
    }
  ): Promise<void> {
    const outputPath = path.join(this.outputDir, streamId)
    const playlistPath = path.join(outputPath, 'playlist.m3u8')
    const segmentPath = path.join(outputPath, 'segment%03d.ts')

    return new Promise((resolve, reject) => {
      // Use native ffmpeg command instead of fluent-ffmpeg
      const ffmpegArgs = [
        '-re', // Read input at native frame rate
        '-i', config.inputUrl,
        '-analyzeduration', '10M',
        '-probesize', '10M',
        // Video codec settings
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-tune', 'zerolatency',
        '-crf', '23',
        '-maxrate', `${config.bitrate || this.getDefaultBitrate(config.quality)}k`,
        '-bufsize', `${(config.bitrate || this.getDefaultBitrate(config.quality)) * 2}k`,
        '-g', '60', // GOP size
        '-keyint_min', '60',
        '-sc_threshold', '0',
        '-bf', '3', // B-frames
        // Audio codec settings
        '-c:a', 'aac',
        '-b:a', `${config.audioBitrate || 128}k`,
        '-ar', `${config.audioSampleRate || 44100}`,
        '-ac', `${config.audioChannels || 2}`,
        // HLS settings
        '-f', 'hls',
        '-hls_time', hlsConfig.segmentDuration.toString(),
        '-hls_list_size', hlsConfig.playlistLength.toString(),
        '-hls_flags', 'delete_segments+append_list+omit_endlist',
        '-hls_segment_filename', segmentPath,
        '-hls_segment_type', 'mpegts',
        '-hls_playlist_type', 'event',
        // Low latency optimizations
        '-hls_init_time', '0',
        '-hls_time', '2',
        '-hls_list_size', '3',
        '-hls_flags', 'delete_segments+append_list+omit_endlist+independent_segments',
        // Resolution and framerate
        '-vf', `scale=${config.resolution || this.getDefaultResolution(config.quality)}`,
        '-r', (config.framerate || 30).toString(),
        // Output
        playlistPath
      ]

      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      this.ffmpegProcesses.set(streamId, ffmpegProcess)

      ffmpegProcess.stdout?.on('data', (data) => {
        console.log(`FFmpeg stdout for stream ${streamId}:`, data.toString())
      })

      ffmpegProcess.stderr?.on('data', (data) => {
        const output = data.toString()
        console.log(`FFmpeg stderr for stream ${streamId}:`, output)
        
        // Parse progress information
        this.parseFFmpegProgress(streamId, output)
      })

      ffmpegProcess.on('error', (error) => {
        console.error(`FFmpeg error for stream ${streamId}:`, error)
        this.emit('stream:error', { streamId, error })
        reject(error)
      })

      ffmpegProcess.on('exit', (code, signal) => {
        console.log(`FFmpeg process for stream ${streamId} exited with code ${code}, signal ${signal}`)
        if (code !== 0) {
          this.emit('stream:error', { streamId, error: `FFmpeg exited with code ${code}` })
        }
      })

      // Wait a bit to ensure the process starts successfully
      setTimeout(() => {
        resolve()
      }, 3000)
    })
  }

  private parseFFmpegProgress(streamId: string, output: string) {
    // Parse FFmpeg progress output
    const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
    const bitrateMatch = output.match(/bitrate=\s*(\d+(?:\.\d+)?)\s*kbits\/s/)
    const fpsMatch = output.match(/fps=\s*(\d+(?:\.\d+)?)/)
    const frameMatch = output.match(/frame=\s*(\d+)/)

    if (timeMatch || bitrateMatch || fpsMatch || frameMatch) {
      const stream = this.streams.get(streamId)
      if (stream) {
        if (bitrateMatch) {
          const bitrate = parseFloat(bitrateMatch[1])
          stream.analytics.averageBitrate = (stream.analytics.averageBitrate + bitrate) / 2
          if (bitrate > stream.analytics.peakBitrate) {
            stream.analytics.peakBitrate = bitrate
          }
        }

        if (frameMatch) {
          const frames = parseInt(frameMatch[1])
          stream.analytics.totalBytes = frames * (stream.bitrate * 1000 / 8) // Rough estimate
        }

        this.streams.set(streamId, stream)
        this.emit('stream:progress', { streamId, output })
      }
    }
  }

  private async startRecording(streamId: string, config: RecordingConfig): Promise<void> {
    const stream = this.streams.get(streamId)
    if (!stream) return

    const outputPath = path.join(this.outputDir, streamId)
    const recordingPath = path.join(outputPath, `recording.${config.format}`)

    return new Promise((resolve, reject) => {
      const recordingArgs = [
        '-i', stream.hlsUrl,
        '-c', 'copy', // Copy streams without re-encoding
        '-f', config.format,
        '-t', config.maxDuration.toString(), // Max duration
        recordingPath
      ]

      const recordingProcess = spawn('ffmpeg', recordingArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      this.recordingProcesses.set(streamId, recordingProcess)

      recordingProcess.on('error', (error) => {
        console.error(`Recording error for stream ${streamId}:`, error)
        this.emit('recording:error', { streamId, error })
        reject(error)
      })

      recordingProcess.on('exit', (code) => {
        if (code === 0) {
          console.log(`Recording completed for stream ${streamId}`)
          this.emit('recording:completed', { streamId, recordingPath })
        } else {
          console.error(`Recording failed for stream ${streamId} with code ${code}`)
        }
      })

      // Update stream info
      stream.recordingPath = recordingPath
      stream.status = 'recording'
      this.streams.set(streamId, stream)
      this.emit('recording:started', { streamId, recordingPath })

      setTimeout(() => {
        resolve()
      }, 2000)
    })
  }

  async stopStream(streamId: string): Promise<void> {
    const stream = this.streams.get(streamId)
    if (!stream) {
      throw new Error(`Stream ${streamId} not found`)
    }

    // Stop FFmpeg process
    const process = this.ffmpegProcesses.get(streamId)
    if (process) {
      process.kill('SIGTERM')
      this.ffmpegProcesses.delete(streamId)
    }

    // Stop recording process
    const recordingProcess = this.recordingProcesses.get(streamId)
    if (recordingProcess) {
      recordingProcess.kill('SIGTERM')
      this.recordingProcesses.delete(streamId)
    }

    stream.status = 'ended'
    stream.endedAt = new Date()
    if (stream.startedAt) {
      stream.analytics.uptime = (stream.endedAt.getTime() - stream.startedAt.getTime()) / 1000
    }
    this.streams.set(streamId, stream)

    this.emit('stream:stopped', { streamId, stream })
    console.log(`Stream stopped: ${streamId}`)
  }

  getStreamInfo(streamId: string): StreamInfo | null {
    return this.streams.get(streamId) || null
  }

  getAllStreams(): StreamInfo[] {
    return Array.from(this.streams.values())
  }

  getActiveStreams(): StreamInfo[] {
    return Array.from(this.streams.values()).filter(s => s.status === 'live')
  }

  updateViewerCount(streamId: string, count: number): void {
    const stream = this.streams.get(streamId)
    if (stream) {
      stream.viewers = count
      this.streams.set(streamId, stream)
      this.emit('viewers:updated', { streamId, count })
    }
  }

  private getDefaultBitrate(quality: string): number {
    switch (quality) {
      case 'low': return 500
      case 'medium': return 1000
      case 'high': return 2500
      case 'ultra': return 5000
      case 'adaptive': return 1500
      default: return 1000
    }
  }

  private getDefaultResolution(quality: string): string {
    switch (quality) {
      case 'low': return '640:360'
      case 'medium': return '1280:720'
      case 'high': return '1920:1080'
      case 'ultra': return '2560:1440'
      case 'adaptive': return '1280:720'
      default: return '1280:720'
    }
  }

  async createAdaptiveStream(config: StreamConfig): Promise<StreamInfo[]> {
    const qualities = [
      { quality: 'low', bitrate: 500, resolution: '640:360' },
      { quality: 'medium', bitrate: 1000, resolution: '1280:720' },
      { quality: 'high', bitrate: 2500, resolution: '1920:1080' },
      { quality: 'ultra', bitrate: 5000, resolution: '2560:1440' }
    ]

    const streams: StreamInfo[] = []

    for (const quality of qualities) {
      const streamConfig = {
        ...config,
        quality: quality.quality as any,
        bitrate: quality.bitrate,
        resolution: quality.resolution
      }

      const stream = await this.startStream(streamConfig)
      streams.push(stream)
    }

    return streams
  }

  async generateMasterManifest(streamId: string, qualities: string[]): Promise<string> {
    const manifest = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=640x360
${streamId}/low/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1280x720
${streamId}/medium/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1920x1080
${streamId}/high/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=2560x1440
${streamId}/ultra/playlist.m3u8`

    const manifestPath = path.join(this.outputDir, streamId, 'master.m3u8')
    await fs.writeFile(manifestPath, manifest)
    
    return `/streams/${streamId}/master.m3u8`
  }

  getStreamAnalytics(streamId: string) {
    return this.streams.get(streamId)?.analytics || null
  }

  getSystemStats() {
    const activeStreams = this.getActiveStreams()
    const totalViewers = activeStreams.reduce((sum, stream) => sum + stream.viewers, 0)
    const totalBitrate = activeStreams.reduce((sum, stream) => sum + stream.analytics.averageBitrate, 0)

    return {
      activeStreams: activeStreams.length,
      totalViewers,
      totalBitrate,
      maxConcurrentStreams: this.maxConcurrentStreams,
      availableSlots: this.maxConcurrentStreams - activeStreams.length
    }
  }

  destroy() {
    // Stop all active streams
    for (const [streamId] of this.streams.entries()) {
      this.stopStream(streamId).catch(console.error)
    }

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    // Remove all listeners
    this.removeAllListeners()
  }
}

// Export singleton instance
export const videoStreamingService = new VideoStreamingService() 