"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, ChevronLeft, ChevronRight } from "lucide-react"
import { Slider } from "@/components/ui/slider"

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
}

export default function VideoPlayer({
  videoId,
  courseId,
  videoUrl,
  title,
  description,
  courseVideos,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [showSidebar, setShowSidebar] = useState(true)

  // Get previous and next video IDs
  const currentIndex = courseVideos.findIndex((v) => v.id === videoId)
  const prevVideo = currentIndex > 0 ? courseVideos[currentIndex - 1] : null
  const nextVideo = currentIndex < courseVideos.length - 1 ? courseVideos[currentIndex + 1] : null

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      // Auto-play next video if available
      if (nextVideo) {
        window.location.href = `/courses/${courseId}/learn/${nextVideo.id}`
      }
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("ended", handleEnded)

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("ended", handleEnded)
    }
  }, [courseId, nextVideo])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
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
      } else {
        videoRef.current.requestFullscreen()
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className={`lg:col-span-${showSidebar ? "3" : "4"}`}>
        <div className="relative">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video ref={videoRef} src={videoUrl} className="w-full h-full" onClick={togglePlay} />

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
                    <div className="flex items-center gap-2 w-24">
                      <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/20">
                        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                      </Button>
                      <Slider value={[volume]} max={1} step={0.01} onValueChange={handleVolumeChange} />
                    </div>

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
          </div>

          <div className="mt-4">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-2 text-muted-foreground">{description}</p>
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
