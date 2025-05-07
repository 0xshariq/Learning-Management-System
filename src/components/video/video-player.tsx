"use client"

import { useState, useEffect } from "react"

interface VideoPlayerProps {
  videoUrl: string
  captionsUrl?: string
  posterUrl?: string
}

export function VideoPlayer({ videoUrl, captionsUrl, posterUrl }: VideoPlayerProps) {
  const [captionsError, setCaptionsError] = useState(false)
  const [captionsLoaded, setCaptionsLoaded] = useState(false)

  // Check if captions file exists when captionsUrl is provided
  useEffect(() => {
    if (!captionsUrl) {
      setCaptionsError(true)
      return
    }

    const checkCaptionsExist = async () => {
      try {
        const response = await fetch(captionsUrl, { method: "HEAD" })
        if (!response.ok) {
          setCaptionsError(true)
        } else {
          setCaptionsLoaded(true)
        }
      } catch (error) {
        setCaptionsError(true)
      }
    }

    checkCaptionsExist()
  }, [captionsUrl])

  return (
    // biome-ignore lint/a11y/useMediaCaption: <explanation>
<video src={videoUrl} controls className="w-full h-full" poster={posterUrl} crossOrigin="anonymous">
      {captionsUrl && !captionsError && (
        <track src={captionsUrl} kind="subtitles" srcLang="en" label="English" default />
      )}
      <track
        src="/captions/default.vtt"
        kind="subtitles"
        srcLang="en"
        label="No captions available"
        default={!captionsUrl || captionsError}
      />
      Your browser does not support the video tag.
    </video>
  )
}
