import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { LiveClass } from "@/models/live-class"
import { Teacher } from "@/models/teacher"
import { Student } from "@/models/student"
import { zenStreamService } from "@/lib/zenstream"
import { videoStreamingService } from "@/lib/video-streaming"
import { rateLimit } from "@/lib/utils"

// Rate limiting configuration
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 100,
})

interface StreamResponse {
  token: string
  streamId: string
  playerUrl: string
  chatUrl: string
  serverUrl: string | undefined
  role: 'teacher' | 'student' | 'admin'
  liveClass: {
    title: string
    description: string | undefined
    scheduledDate: Date
    status: 'scheduled' | 'live' | 'ended' | 'cancelled'
    isLive: boolean
  }
  streamKey?: string
  hlsUrl?: string
  rtmpUrl?: string
  webRtcUrl?: string
  quality?: string
  bitrate?: number
  resolution?: string
  analytics?: {
    viewerCount: number
    peakViewers: number
    averageWatchTime: number
    chatMessages: number
  }
  permissions: string[]
  expiresAt: Date
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         request.ip || 
         'unknown'
}

// Helper function to get device fingerprint
function getDeviceFingerprint(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || ''
  const acceptLanguage = request.headers.get('accept-language') || ''
  const acceptEncoding = request.headers.get('accept-encoding') || ''
  
  // Create a simple fingerprint from headers
  const fingerprint = `${userAgent}:${acceptLanguage}:${acceptEncoding}`
  return require('crypto').createHash('sha256').update(fingerprint).digest('hex')
}

// Helper function to validate access permissions
async function validateAccess(
  session: any, 
  liveClass: any, 
  request: NextRequest
): Promise<{ userId: string; userRole: 'teacher' | 'student' | 'admin'; deviceId: string }> {
  let userId: string
  let userRole: 'teacher' | 'student' | 'admin'

  // Verify access and get user info
  if (session.user.role === "teacher") {
    const teacher = await Teacher.findOne({ email: session.user.email })
    if (!teacher || liveClass.teacher.toString() !== teacher._id.toString()) {
      throw new Error("Unauthorized access to this live class")
    }
    userId = teacher._id.toString()
    userRole = 'teacher'
  } else if (session.user.role === "student") {
    const student = await Student.findOne({ email: session.user.email })
    if (!student) {
      throw new Error("Student not found")
    }
    
    if (student.isBlocked) {
      throw new Error("Your account has been blocked")
    }
    
    // Check if student is enrolled in the course
    if (!student.purchasedCourses?.includes(liveClass.course._id)) {
      throw new Error("You are not enrolled in this course")
    }
    
    userId = student._id.toString()
    userRole = 'student'

    // Add student to attendees if not already present
    if (!liveClass.attendees.includes(student._id)) {
      await LiveClass.findByIdAndUpdate(liveClass._id, {
        $addToSet: { attendees: student._id }
      })
    }
  } else if (session.user.role === "admin") {
    userId = session.user.id
    userRole = 'admin'
  } else {
    throw new Error("Invalid user role")
  }

  const deviceId = getDeviceFingerprint(request)
  
  return { userId, userRole, deviceId }
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
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const liveClass = await LiveClass.findById(params.id)
      .populate('course', 'title description')
      .lean()

    if (!liveClass) {
      return NextResponse.json({ error: "Live class not found" }, { status: 404 })
    }

    // Validate access and get user info
    const { userId, userRole, deviceId } = await validateAccess(session, liveClass, request)

    // Generate JWT token for stream access with enhanced security
    const token = zenStreamService.generateJWTToken(
      liveClass.streamId, 
      userId, 
      userRole,
      {
        deviceId,
        ipAddress: ip,
        expiresIn: 4 * 60 * 60 // 4 hours
      }
    )

    // Generate stream URLs with token
    const streamUrls = zenStreamService.generateStreamUrls(liveClass.streamId, token)

    // Get stream info from video streaming service
    const streamInfo = videoStreamingService.getStreamInfo(liveClass.streamId)

    // Get analytics from zenstream service
    const analytics = zenStreamService.getStreamAnalytics(liveClass.streamId)

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + (4 * 60 * 60 * 1000))

    const response: StreamResponse = {
      token,
      streamId: liveClass.streamId,
      playerUrl: streamUrls.playerUrl,
      chatUrl: streamUrls.chatUrl,
      serverUrl: streamUrls.serverUrl,
      webRtcUrl: streamUrls.webRtcUrl,
      role: userRole,
      liveClass: {
        title: liveClass.title,
        description: liveClass.description,
        scheduledDate: liveClass.scheduledDate,
        status: liveClass.status,
        isLive: liveClass.isLive
      },
      permissions: userRole === 'teacher' 
        ? ['stream', 'chat', 'moderate', 'control', 'record', 'analytics']
        : userRole === 'admin'
        ? ['stream', 'chat', 'moderate', 'control', 'record', 'analytics', 'admin']
        : ['view', 'chat'],
      expiresAt
    }

    // Add stream key for teachers and admins only
    if (userRole === 'teacher' || userRole === 'admin') {
      response.streamKey = liveClass.streamKey
    }

    // Add HLS streaming info if available
    if (streamInfo) {
      response.hlsUrl = streamInfo.hlsUrl
      response.rtmpUrl = streamInfo.rtmpUrl
      response.quality = streamInfo.quality
      response.bitrate = streamInfo.bitrate
      response.resolution = streamInfo.resolution
    }

    // Add analytics if available
    if (analytics) {
      response.analytics = {
        viewerCount: analytics.viewerCount,
        peakViewers: analytics.peakViewers,
        averageWatchTime: analytics.averageWatchTime,
        chatMessages: analytics.chatMessages
      }
    }

    // Track stream access
    zenStreamService.incrementViewerCount(liveClass.streamId)

    return NextResponse.json(response)

  } catch (error) {
    console.error("Error generating stream token:", error)
    
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      
      if (error.message.includes("Unauthorized") || error.message.includes("blocked")) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      
      if (error.message.includes("enrolled")) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET endpoint to check stream status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const liveClass = await LiveClass.findById(params.id)
      .populate('course', 'title description')
      .lean()

    if (!liveClass) {
      return NextResponse.json({ error: "Live class not found" }, { status: 404 })
    }

    // Get stream info from video streaming service
    const streamInfo = videoStreamingService.getStreamInfo(liveClass.streamId)
    const analytics = zenStreamService.getStreamAnalytics(liveClass.streamId)

    return NextResponse.json({
      streamId: liveClass.streamId,
      status: liveClass.status,
      isLive: liveClass.isLive,
      viewerCount: analytics?.viewerCount || 0,
      streamInfo: streamInfo ? {
        status: streamInfo.status,
        quality: streamInfo.quality,
        bitrate: streamInfo.bitrate,
        resolution: streamInfo.resolution,
        uptime: streamInfo.analytics?.uptime || 0
      } : null
    })

  } catch (error) {
    console.error("Error checking stream status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
