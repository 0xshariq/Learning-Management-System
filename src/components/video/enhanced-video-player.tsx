'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  RotateCcw,
  Settings,
  Download,
  Share2,
  BookmarkPlus,
  Eye,
  Clock,
  Target,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Monitor,
  Smartphone,
  Tablet,
  Wifi,
  WifiOff,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoQuality {
  label: string
  value: string
  bitrate: number
  resolution: string
}

interface VideoAnalytics {
  watchTime: number
  bufferingEvents: number
  qualitySwitches: number
  errors: number
  averageBitrate: number
  peakBitrate: number
  lastQuality: string
  currentTime: number
  totalTime: number
}

interface EnhancedVideoPlayerProps {
  videoUrl: string
  title: string
  videoId: string
  courseId: string
  description?: string
  courseVideos?: Array<{
    id: string
    title: string
    position: number
    isCurrent: boolean
  }>
  onProgress?: (progress: number) => void
  onQualityChange?: (quality: string) => void
  onError?: (error: string) => void
  onAnalytics?: (analytics: VideoAnalytics) => void
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  controls?: boolean
  poster?: string
  preload?: 'none' | 'metadata' | 'auto'
  className?: string
}

export default function EnhancedVideoPlayer({
  videoUrl,
  title,
  videoId,
  courseId,
  description,
  courseVideos,
  onProgress,
  onQualityChange,
  onError,
  onAnalytics,
  autoPlay = false,
  muted = false,
  loop = false,
  controls = true,
  poster,
  preload = 'metadata',
  className,
}: EnhancedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout>()
  const analyticsIntervalRef = useRef<NodeJS.Timeout>()

  // State management
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(muted)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [selectedQuality, setSelectedQuality] = useState<string>('auto')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [networkQuality, setNetworkQuality] = useState<'high' | 'medium' | 'low'>('high')
  const [analytics, setAnalytics] = useState<VideoAnalytics>({
    watchTime: 0,
    bufferingEvents: 0,
    qualitySwitches: 0,
    errors: 0,
    averageBitrate: 0,
    peakBitrate: 0,
    lastQuality: 'auto',
    currentTime: 0,
    totalTime: 0,
  })

  // Quality options
  const qualityOptions: VideoQuality[] = [
    { label: 'Auto', value: 'auto', bitrate: 0, resolution: 'Auto' },
    { label: '1080p', value: '1080p', bitrate: 5000, resolution: '1920x1080' },
    { label: '720p', value: '720p', bitrate: 2500, resolution: '1280x720' },
    { label: '480p', value: '480p', bitrate: 1000, resolution: '854x480' },
    { label: '360p', value: '360p', bitrate: 500, resolution: '640x360' },
  ]

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (isPlaying && showControls) {
      timeout = setTimeout(() => setShowControls(false), 3000)
    }
    return () => clearTimeout(timeout)
  }, [isPlaying, showControls])

  // Progress tracking
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        if (videoRef.current) {
          const current = videoRef.current.currentTime
          const total = videoRef.current.duration
          setCurrentTime(current)
          
          if (onProgress && total > 0) {
            onProgress((current / total) * 100)
          }
        }
      }, 1000)
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [isPlaying, onProgress])

  // Analytics tracking
  useEffect(() => {
    analyticsIntervalRef.current = setInterval(() => {
      if (videoRef.current && isPlaying) {
        const newAnalytics = {
          ...analytics,
          currentTime: videoRef.current.currentTime,
          totalTime: videoRef.current.duration,
          watchTime: analytics.watchTime + 1,
        }
        setAnalytics(newAnalytics)
        
        if (onAnalytics) {
          onAnalytics(newAnalytics)
        }
      }
    }, 1000)

    return () => {
      if (analyticsIntervalRef.current) {
        clearInterval(analyticsIntervalRef.current)
      }
    }
  }, [analytics, isPlaying, onAnalytics])

  // Event handlers
  const handlePlay = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }, [])

  const handlePause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      handlePause()
    } else {
      handlePlay()
    }
  }, [isPlaying, handlePlay, handlePause])

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
    }
    setIsMuted(newVolume === 0)
  }, [])

  const handleToggleMute = useCallback(() => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume
        setIsMuted(false)
      } else {
        videoRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }, [isMuted, volume])

  const handleSeek = useCallback((value: number[]) => {
    const newTime = value[0]
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }, [])

  const handleQualityChange = useCallback((quality: string) => {
    setSelectedQuality(quality)
    setShowQualityMenu(false)
    
    if (onQualityChange) {
      onQualityChange(quality)
    }

    // Simulate quality switch analytics
    setAnalytics(prev => ({
      ...prev,
      qualitySwitches: prev.qualitySwitches + 1,
      lastQuality: quality,
    }))
  }, [onQualityChange])

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const handleError = useCallback((error: string) => {
    setError(error)
    setAnalytics(prev => ({ ...prev, errors: prev.errors + 1 }))
    if (onError) {
      onError(error)
    }
  }, [onError])

  const handleRetry = useCallback(() => {
    setError(null)
    setIsLoading(true)
    if (videoRef.current) {
      videoRef.current.load()
    }
  }, [])

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getNetworkQualityIcon = () => {
    switch (networkQuality) {
      case 'high':
        return <SignalHigh className="h-4 w-4 text-green-500" />
      case 'medium':
        return <SignalMedium className="h-4 w-4 text-yellow-500" />
      case 'low':
        return <SignalLow className="h-4 w-4 text-red-500" />
      default:
        return <Signal className="h-4 w-4 text-gray-500" />
    }
  }

  if (error) {
    return (
      <Card className={cn('aspect-video bg-black', className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-white">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Video Error</h3>
            <p className="text-sm text-gray-400 mb-4">{error}</p>
            <Button onClick={handleRetry} variant="outline" className="text-white border-white hover:bg-white hover:text-black">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={cn(
          'relative aspect-video bg-black rounded-lg overflow-hidden group',
          className
        )}
        onMouseMove={() => setShowControls(true)}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          poster={poster}
          preload={preload}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          onLoadStart={() => setIsLoading(true)}
          onCanPlay={() => setIsLoading(false)}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration)
            }
          }}
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime)
              if (videoRef.current.buffered.length > 0) {
                setBuffered(videoRef.current.buffered.end(0))
              }
            }
          }}
          onError={() => handleError('Failed to load video')}
          onWaiting={() => {
            setAnalytics(prev => ({ ...prev, bufferingEvents: prev.bufferingEvents + 1 }))
          }}
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
              <p className="text-sm">Loading video...</p>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        {showControls && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent">
            {/* Top Controls */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  {analytics.watchTime}s watched
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getNetworkQualityIcon()}
                  {networkQuality}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                      <BookmarkPlus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bookmark</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Center Play Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                onClick={handleTogglePlay}
                size="lg"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="h-8 w-8" />
                )}
              </Button>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleTogglePlay}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = Math.max(0, currentTime - 10)
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>

                  <Button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = Math.min(duration, currentTime + 10)
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      onClick={handleToggleMute}
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      max={1}
                      step={0.1}
                      onValueChange={handleVolumeChange}
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Button
                      onClick={() => setShowQualityMenu(!showQualityMenu)}
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    
                    {showQualityMenu && (
                      <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg p-2 min-w-[120px]">
                        {qualityOptions.map((quality) => (
                          <button
                            key={quality.value}
                            onClick={() => handleQualityChange(quality.value)}
                            className={cn(
                              'w-full text-left px-3 py-2 text-sm text-white hover:bg-white/20 rounded',
                              selectedQuality === quality.value && 'bg-white/20'
                            )}
                          >
                            {quality.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleFullscreen}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    {isFullscreen ? (
                      <Minimize className="h-4 w-4" />
                    ) : (
                      <Maximize className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Info Overlay */}
        {!showControls && (
          <div className="absolute top-4 left-4">
            <h3 className="text-white font-medium">{title}</h3>
            {description && (
              <p className="text-white/80 text-sm">{description}</p>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
} 