"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, ChevronLeft, ChevronRight, 
  Settings, Wifi, WifiOff, Clock, Download, Share2, Cast, PictureInPicture, RotateCcw,
  AlertCircle, CheckCircle, XCircle, RefreshCw, Eye, EyeOff, Lock, Unlock
} from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { toast } from "@/hooks/use-toast"
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import Hls from 'hls.js'

interface VideoPlayerProps {
  videoId: string
  courseId: string
  videoUrl: string
  title: string
  description: string
  courseVideos: {
    id: string
    title: string
    position: number
    isCurrent: boolean
  }[]
  isLive?: boolean
  liveUrl?: string
  poster?: string
  onQualityChange?: (quality: string) => void
  onError?: (error: string) => void
  onAnalytics?: (data: any) => void
}

interface QualityOption {
  label: string
  value: string
  bitrate?: number
  resolution?: string
}

interface PlayerAnalytics {
  watchTime: number
  qualitySwitches: number
  bufferingEvents: number
  errors: number
  lastQuality: string
  averageBitrate: number
}

export default function VideoPlayer({
  videoId,
  courseId,
  videoUrl,
  title,
  description,
  courseVideos,
  isLive = false,
  liveUrl,
  poster,
  onQualityChange,
  onError,
  onAnalytics
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<any>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quality, setQuality] = useState<string>('auto')
  const [availableQualities, setAvailableQualities] = useState<QualityOption[]>([])
  const [isHLS, setIsHLS] = useState(false)
  const [liveLatency, setLiveLatency] = useState<number>(0)
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'excellent'>('good')
  const [isPictureInPicture, setIsPictureInPicture] = useState(false)
  const [isCasting, setIsCasting] = useState(false)
  const [analytics, setAnalytics] = useState<PlayerAnalytics>({
    watchTime: 0,
    qualitySwitches: 0,
    bufferingEvents: 0,
    errors: 0,
    lastQuality: 'auto',
    averageBitrate: 0
  })
  const [lastActivity, setLastActivity] = useState(Date.now())
  const [autoHideControls, setAutoHideControls] = useState(true)

  // Get previous and next video IDs
  const currentIndex = courseVideos.findIndex((v) => v.id === videoId)
  const prevVideo = currentIndex > 0 ? courseVideos[currentIndex - 1] : null
  const nextVideo = currentIndex < courseVideos.length - 1 ? courseVideos[currentIndex + 1] : null

  // Check if video is HLS
  useEffect(() => {
    const isHLSStream = videoUrl.includes('.m3u8') || liveUrl?.includes('.m3u8')
    setIsHLS(isHLSStream || false)
  }, [videoUrl, liveUrl])

  // Auto-hide controls after inactivity
  useEffect(() => {
    if (!autoHideControls) return

    const hideTimeout = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)

    return () => clearTimeout(hideTimeout)
  }, [lastActivity, isPlaying, autoHideControls])

  // Track user activity
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now())
    setShowControls(true)
  }, [])

  // Initialize Video.js player
  useEffect(() => {
    if (!videoRef.current) return

    const video = videoRef.current
    const isHLSStream = videoUrl.includes('.m3u8') || liveUrl?.includes('.m3u8')
    const sourceUrl = isLive && liveUrl ? liveUrl : videoUrl

    if (isHLSStream && Hls.isSupported()) {
      // Initialize HLS with enhanced configuration
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000, // 60MB
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 5,
        maxFragLookUpTolerance: 0.25,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        liveDurationInfinity: true,
        liveBackBufferLength: 90,
        liveSyncDuration: 4,
        liveMaxLatencyDuration: 10,
        liveTolerance: 15 * 1000,
        progressive: false,
        progressiveMaxLength: 30,
        progressiveMaxLengthRatio: 0.3,
        progressiveCues: true,
        enableSoftwareAES: true,
        enableStashBuffer: true,
        stashInitialSize: 384 * 1024, // 384KB
        enableDateRangeMetadataCues: true,
        enableEmsgMetadataCues: true,
        enableID3MetadataCues: true,
        enableWebVTT: true,
        enableIMSC1: true,
        enableCEA708Captions: true,
        captionsTextTrack1Label: 'English',
        captionsTextTrack1LanguageCode: 'en',
        renderTextTracksNatively: true,
        renderCaptionsNatively: true,
        enableAbrController: true,
        abrEwmaDefaultEstimate: 500000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        abrMaxWithRealBitrate: true,
        abrBandWidthDownFactor: 0.9,
        abrEwmaFastLive: 3.0,
        abrEwmaSlowLive: 9.0,
        abrEwmaFastVoD: 2.0,
        abrEwmaSlowVoD: 9.0,
        abrEwmaFastVoDCoef: 0.003,
        abrEwmaSlowVoDCoef: 0.001,
        abrEwmaFastLiveCoef: 0.003,
        abrEwmaSlowLiveCoef: 0.001,
        // Enhanced error handling
        fragLoadingTimeOut: 20000,
        manifestLoadingTimeOut: 10000,
        levelLoadingTimeOut: 10000,
        xhrSetup: (xhr, url) => {
          // Add custom headers if needed
          xhr.withCredentials = false
        }
      })

      hlsRef.current = hls
      hls.loadSource(sourceUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('HLS manifest loaded')
        setDuration(video.duration || 0)
        setError(null)
        
        // Extract quality options from HLS levels
        if (data.levels) {
          const qualities: QualityOption[] = [
            { label: 'Auto', value: 'auto' }
          ]
          
          data.levels.forEach((level, index) => {
            qualities.push({
              label: `${level.height}p (${Math.round(level.bitrate / 1000)}kbps)`,
              value: index.toString(),
              bitrate: level.bitrate,
              resolution: `${level.width}x${level.height}`
            })
          })
          
          setAvailableQualities(qualities)
        }
      })

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        console.log('Quality changed to:', data.level)
        const newQuality = data.level.toString()
        setQuality(newQuality)
        analytics.qualitySwitches++
        analytics.lastQuality = newQuality
        
        // Update connection quality based on bitrate
        const currentLevel = data.levels[data.level]
        if (currentLevel) {
          const bitrate = currentLevel.bitrate
          analytics.averageBitrate = (analytics.averageBitrate + bitrate) / 2
          
          if (bitrate > 2000000) {
            setConnectionQuality('excellent')
          } else if (bitrate > 1000000) {
            setConnectionQuality('good')
          } else {
            setConnectionQuality('poor')
          }
        }
        
        setAnalytics({ ...analytics })
        onQualityChange?.(newQuality)
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data)
        analytics.errors++
        setAnalytics({ ...analytics })
        
        const errorMessage = `Playback error: ${data.details}`
        setError(errorMessage)
        onError?.(errorMessage)
        
        // Attempt to recover from certain errors
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, attempting to recover...')
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, attempting to recover...')
              hls.recoverMediaError()
              break
            default:
              console.error('Fatal error, cannot recover')
              break
          }
        }
      })

      // Live stream specific events
      if (isLive) {
        hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
          // Calculate live latency
          const now = Date.now()
          const fragTime = data.frag.programTime * 1000
          const latency = now - fragTime
          setLiveLatency(latency)
        })
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = sourceUrl
    } else {
      // Regular video source
      video.src = sourceUrl
    }

    // Video event listeners
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      analytics.watchTime += 0.1 // Increment watch time
      setAnalytics({ ...analytics })
      updateActivity()
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setError(null)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      // Auto-play next video if available
      if (nextVideo) {
        window.location.href = `/courses/${courseId}/learn/${nextVideo.id}`
      }
    }

    const handlePlay = () => {
      setIsPlaying(true)
      setError(null)
      updateActivity()
    }

    const handlePause = () => {
      setIsPlaying(false)
      updateActivity()
    }

    const handleWaiting = () => {
      setBuffering(true)
      analytics.bufferingEvents++
      setAnalytics({ ...analytics })
    }

    const handleCanPlay = () => {
      setBuffering(false)
    }

    const handleError = (e: Event) => {
      console.error('Video error:', e)
      analytics.errors++
      setAnalytics({ ...analytics })
      const errorMessage = 'Failed to load video'
      setError(errorMessage)
      onError?.(errorMessage)
    }

    const handleSeeking = () => {
      updateActivity()
    }

    const handleSeeked = () => {
      updateActivity()
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("ended", handleEnded)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("waiting", handleWaiting)
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("error", handleError)
    video.addEventListener("seeking", handleSeeking)
    video.addEventListener("seeked", handleSeeked)

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("ended", handleEnded)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("waiting", handleWaiting)
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("error", handleError)
      video.removeEventListener("seeking", handleSeeking)
      video.removeEventListener("seeked", handleSeeked)
      
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
    }
  }, [videoUrl, liveUrl, isLive, courseId, nextVideo, analytics, updateActivity, onQualityChange, onError])

  // Send analytics periodically
  useEffect(() => {
    const analyticsInterval = setInterval(() => {
      if (analytics.watchTime > 0) {
        onAnalytics?.(analytics)
      }
    }, 10000) // Send analytics every 10 seconds

    return () => clearInterval(analyticsInterval)
  }, [analytics, onAnalytics])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      setIsMuted(newVolume === 0)
    }
  }

  const handleSeek = (value: number[]) => {
    const newTime = value[0]
    setCurrentTime(newTime)
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
    }
  }

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
        setIsFullscreen(false)
      } else {
        videoRef.current.requestFullscreen()
        setIsFullscreen(true)
      }
    }
  }

  const togglePictureInPicture = async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture()
      setIsPictureInPicture(false)
    } else if (videoRef.current && document.pictureInPictureEnabled) {
      await videoRef.current.requestPictureInPicture()
      setIsPictureInPicture(true)
    }
  }

  const handleQualityChange = (newQuality: string) => {
    setQuality(newQuality)
    if (hlsRef.current && newQuality !== 'auto') {
      const levelIndex = parseInt(newQuality)
      if (!isNaN(levelIndex)) {
        hlsRef.current.currentLevel = levelIndex
      }
    } else if (hlsRef.current) {
      hlsRef.current.currentLevel = -1 // Auto
    }
  }

  const retryPlayback = () => {
    setError(null)
    if (videoRef.current) {
      videoRef.current.load()
      videoRef.current.play()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const formatLatency = (ms: number) => {
    return `${Math.round(ms / 1000)}s`
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className={`lg:col-span-${showSidebar ? "3" : "4"}`}>
        <div className="relative">
          <div 
            className="relative aspect-video bg-black rounded-lg overflow-hidden"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setAutoHideControls && setShowControls(false)}
            onMouseMove={updateActivity}
          >
            <video 
              ref={videoRef} 
              src={videoUrl} 
              poster={poster}
              className="w-full h-full cursor-pointer" 
              onClick={togglePlay}
            />

            {/* Live indicator */}
            {isLive && (
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <Badge variant="destructive" className="animate-pulse">
                  🔴 LIVE
                </Badge>
                <div className="flex items-center gap-1 text-white text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{formatLatency(liveLatency)}</span>
                </div>
                <div className="flex items-center gap-1">
                  {connectionQuality === 'excellent' && <Wifi className="w-4 h-4 text-green-400" />}
                  {connectionQuality === 'good' && <Wifi className="w-4 h-4 text-yellow-400" />}
                  {connectionQuality === 'poor' && <WifiOff className="w-4 h-4 text-red-400" />}
                </div>
              </div>
            )}

            {/* Buffering indicator */}
            {buffering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center text-white">
                  <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-2">Playback Error</p>
                  <p className="text-sm mb-4">{error}</p>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      onClick={retryPlayback} 
                      variant="outline"
                      className="text-white border-white hover:bg-white hover:text-black"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                    <Button 
                      onClick={() => window.location.reload()} 
                      variant="outline"
                      className="text-white border-white hover:bg-white hover:text-black"
                    >
                      Reload Page
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Video controls */}
            {showControls && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex flex-col gap-2">
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="w-full"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-white/20">
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </Button>

                      {prevVideo && (
                        <Link href={`/courses/${courseId}/learn/${prevVideo.id}`}>
                          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                            <SkipBack className="h-5 w-5" />
                          </Button>
                        </Link>
                      )}

                      {nextVideo && (
                        <Link href={`/courses/${courseId}/learn/${nextVideo.id}`}>
                          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                            <SkipForward className="h-5 w-5" />
                          </Button>
                        </Link>
                      )}

                      <span className="text-xs text-white">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Quality selector for HLS */}
                      {isHLS && availableQualities.length > 0 && (
                        <Select value={quality} onValueChange={handleQualityChange}>
                          <SelectTrigger className="w-24 h-8 text-xs text-white bg-black/20 border-white/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableQualities.map((q) => (
                              <SelectItem key={q.value} value={q.value}>
                                {q.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {/* Picture in Picture */}
                      {document.pictureInPictureEnabled && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={togglePictureInPicture}
                          className="text-white hover:bg-white/20"
                        >
                          <PictureInPicture className="h-5 w-5" />
                        </Button>
                      )}

                      {/* Volume controls */}
                      <div className="flex items-center gap-2 w-24">
                        <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/20">
                          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                        </Button>
                        <Slider value={[volume]} max={1} step={0.01} onValueChange={handleVolumeChange} />
                      </div>

                      {/* Fullscreen */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleFullscreen}
                        className="text-white hover:bg-white/20"
                      >
                        <Maximize className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-2 text-muted-foreground">{description}</p>
            
            {/* Video info */}
            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              {isHLS && (
                <div className="flex items-center gap-1">
                  <Settings className="w-4 h-4" />
                  <span>HLS Adaptive Streaming</span>
                </div>
              )}
              {isLive && (
                <div className="flex items-center gap-1">
                  <Wifi className="w-4 h-4" />
                  <span>{connectionQuality} connection</span>
                </div>
              )}
              {analytics.watchTime > 0 && (
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>Watched: {formatTime(analytics.watchTime)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSidebar && (
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Course Content</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowSidebar(false)} className="lg:hidden">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-2">
            {courseVideos.map((video) => (
              <Link key={video.id} href={`/courses/${courseId}/learn/${video.id}`}>
                <Card className={`hover:bg-accent transition-colors ${video.isCurrent ? "border-primary" : ""}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-muted rounded-full w-6 h-6 flex items-center justify-center text-xs">
                        {video.position}
                      </div>
                      <span className={`text-sm ${video.isCurrent ? "font-medium" : ""}`}>{video.title}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!showSidebar && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowSidebar(true)}
          className="fixed bottom-4 right-4 z-10 rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
