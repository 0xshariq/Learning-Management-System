import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { LiveClass } from "@/models/live-class"
import { Teacher } from "@/models/teacher"
import { videoStreamingService } from "@/lib/video-streaming"
import { rateLimit } from "@/lib/utils"

// Rate limiting configuration
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 10,
})

interface StartStreamRequest {
  inputUrl?: string
  quality?: 'low' | 'medium' | 'high' | 'adaptive' | 'ultra'
  bitrate?: number
  resolution?: string
  framerate?: number
  recordingEnabled?: boolean
  lowLatency?: boolean
}

interface StartStreamResponse {
  streamId: string
  streamKey: string
  rtmpUrl: string
  hlsUrl: string
  webRtcUrl?: string
  status: string
  message: string
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         request.ip || 
         'unknown'
}

// Helper function to validate teacher access
async function validateTeacherAccess(teacherId: string, liveClassId: string) {
  const teacher = await Teacher.findById(teacherId).lean()
  if (!teacher) {
    throw new Error("Teacher not found")
  }
  
  if (teacher.isBlocked) {
    throw new Error("Teacher account is blocked")
  }

  const liveClass = await LiveClass.findById(liveClassId).lean()
  if (!liveClass) {
    throw new Error("Live class not found")
  }
  
  if (liveClass.teacher.toString() !== teacherId) {
    throw new Error("You can only start your own live classes")
  }

  if (liveClass.isLive) {
    throw new Error("Live class is already active")
  }

  if (liveClass.status === 'ended' || liveClass.status === 'cancelled') {
    throw new Error("Cannot start an ended or cancelled live class")
  }

  return { teacher, liveClass }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    const ip = getClientIP(request)
    const { success } = await limiter.limit(ip)
    if (!success) {
      return NextResponse.json({ error: "Too many stream start requests" }, { status: 429 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    // Validate teacher access
    const { teacher, liveClass } = await validateTeacherAccess(session.user.id, params.id)

    const body: StartStreamRequest = await request.json()
    const {
      inputUrl = 'rtmp://localhost/live',
      quality = 'adaptive',
      bitrate,
      resolution,
      framerate = 30,
      recordingEnabled = true,
      lowLatency = true
    } = body

    // Check if stream is already running
    const existingStream = videoStreamingService.getStreamInfo(liveClass.streamId)
    if (existingStream && existingStream.status === 'live') {
      return NextResponse.json({ 
        error: "Stream is already active",
        streamInfo: existingStream
      }, { status: 409 })
    }

    // Start the stream
    const streamConfig = {
      inputUrl,
      outputPath: `./public/streams/${liveClass.streamId}`,
      streamKey: liveClass.streamKey,
      quality,
      bitrate: bitrate || (quality === 'ultra' ? 5000 : quality === 'high' ? 2500 : quality === 'medium' ? 1000 : 500),
      resolution: resolution || (quality === 'ultra' ? '2560:1440' : quality === 'high' ? '1920:1080' : quality === 'medium' ? '1280:720' : '640:360'),
      framerate,
      audioBitrate: 128,
      audioChannels: 2,
      audioSampleRate: 44100
    }

    const streamOptions = {
      hlsConfig: {
        segmentDuration: 4,
        playlistLength: 6,
        targetDuration: 4,
        maxSegmentDuration: 6,
        lowLatency: true,
        enableDateRange: true,
        enableEmsg: true,
        enableID3: true
      },
      webRtcConfig: {
        enabled: true,
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        maxBitrate: 2500,
        enableSimulcast: true,
        enableSvc: false
      },
      recordingConfig: {
        enabled: recordingEnabled,
        format: 'mp4' as const,
        quality: 'high' as const,
        includeAudio: true,
        maxDuration: 4 * 60 * 60 // 4 hours
      }
    }

    const streamInfo = await videoStreamingService.startStream(streamConfig, streamOptions)

    // Update live class status
    await LiveClass.findByIdAndUpdate(params.id, {
      isLive: true,
      status: 'live',
      startedAt: new Date(),
      updatedAt: new Date()
    })

    const response: StartStreamResponse = {
      streamId: streamInfo.streamId,
      streamKey: streamInfo.streamKey,
      rtmpUrl: streamInfo.rtmpUrl,
      hlsUrl: streamInfo.hlsUrl,
      webRtcUrl: streamInfo.webRtcUrl,
      status: streamInfo.status,
      message: "Stream started successfully"
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("Error starting stream:", error)
    
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      
      if (error.message.includes("blocked")) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      
      if (error.message.includes("already")) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      
      if (error.message.includes("Cannot start")) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    // Validate teacher access
    const { teacher, liveClass } = await validateTeacherAccess(session.user.id, params.id)

    // Stop the stream
    await videoStreamingService.stopStream(liveClass.streamId)

    // Update live class status
    await LiveClass.findByIdAndUpdate(params.id, {
      isLive: false,
      status: 'ended',
      endedAt: new Date(),
      updatedAt: new Date()
    })

    return NextResponse.json({
      message: "Stream stopped successfully",
      streamId: liveClass.streamId
    })

  } catch (error) {
    console.error("Error stopping stream:", error)
    
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      
      if (error.message.includes("blocked")) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 