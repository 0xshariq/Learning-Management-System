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

interface AnalyticsData {
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
  streamInfo?: {
    status: string
    quality: string
    bitrate: number
    resolution: string
    uptime: number
    totalBytes: number
    averageBitrate: number
    peakBitrate: number
  }
  deviceStats?: {
    totalDevices: number
    uniqueIPs: number
    activeSessions: number
  }
  qualityDistribution?: {
    auto: number
    '1080p': number
    '720p': number
    '480p': number
    '360p': number
  }
}

interface AnalyticsUpdate {
  type: 'viewer_join' | 'viewer_leave' | 'chat_message' | 'quality_switch' | 'buffering' | 'error'
  data?: any
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         request.ip || 
         'unknown'
}

// Helper function to validate access permissions
async function validateAnalyticsAccess(
  session: any, 
  liveClass: any
): Promise<{ userId: string; userRole: 'teacher' | 'student' | 'admin' }> {
  let userId: string
  let userRole: 'teacher' | 'student' | 'admin'

  if (session.user.role === "teacher") {
    const teacher = await Teacher.findOne({ email: session.user.email })
    if (!teacher || liveClass.teacher.toString() !== teacher._id.toString()) {
      throw new Error("Unauthorized access to analytics")
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
    
    // Students can only view basic analytics
    userId = student._id.toString()
    userRole = 'student'
  } else if (session.user.role === "admin") {
    userId = session.user.id
    userRole = 'admin'
  } else {
    throw new Error("Invalid user role")
  }

  return { userId, userRole }
}

export async function GET(
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
      .populate('course', 'title')
      .lean()

    if (!liveClass) {
      return NextResponse.json({ error: "Live class not found" }, { status: 404 })
    }

    // Validate access
    const { userId, userRole } = await validateAnalyticsAccess(session, liveClass)

    // Get analytics from zenstream service
    const analytics = zenStreamService.getStreamAnalytics(liveClass.streamId)
    
    // Get stream info from video streaming service
    const streamInfo = videoStreamingService.getStreamInfo(liveClass.streamId)
    const streamAnalytics = videoStreamingService.getStreamAnalytics(liveClass.streamId)

    // Get active sessions count
    const activeSessions = zenStreamService.getActiveSessionsCount(liveClass.streamId)

    // Build analytics response
    const analyticsData: AnalyticsData = {
      streamId: liveClass.streamId,
      viewerCount: analytics?.viewerCount || 0,
      peakViewers: analytics?.peakViewers || 0,
      averageWatchTime: analytics?.averageWatchTime || 0,
      chatMessages: analytics?.chatMessages || 0,
      qualitySwitches: analytics?.qualitySwitches || 0,
      bufferingEvents: analytics?.bufferingEvents || 0,
      errors: analytics?.errors || 0,
      startedAt: analytics?.startedAt || liveClass.startedAt || new Date(),
      endedAt: analytics?.endedAt,
      deviceStats: {
        totalDevices: activeSessions,
        uniqueIPs: activeSessions, // Simplified for now
        activeSessions
      }
    }

    // Add stream info for teachers and admins
    if (userRole === 'teacher' || userRole === 'admin') {
      analyticsData.streamInfo = streamInfo ? {
        status: streamInfo.status,
        quality: streamInfo.quality,
        bitrate: streamInfo.bitrate,
        resolution: streamInfo.resolution,
        uptime: streamInfo.analytics?.uptime || 0,
        totalBytes: streamInfo.analytics?.totalBytes || 0,
        averageBitrate: streamInfo.analytics?.averageBitrate || 0,
        peakBitrate: streamInfo.analytics?.peakBitrate || 0
      } : undefined
    }

    // Add quality distribution for teachers and admins
    if (userRole === 'teacher' || userRole === 'admin') {
      analyticsData.qualityDistribution = {
        auto: Math.floor(Math.random() * 50) + 20, // Simulated data
        '1080p': Math.floor(Math.random() * 30) + 10,
        '720p': Math.floor(Math.random() * 40) + 15,
        '480p': Math.floor(Math.random() * 20) + 5,
        '360p': Math.floor(Math.random() * 10) + 2
      }
    }

    return NextResponse.json(analyticsData)

  } catch (error) {
    console.error("Error fetching analytics:", error)
    
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      
      if (error.message.includes("Unauthorized") || error.message.includes("blocked")) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const liveClass = await LiveClass.findById(params.id).lean()
    if (!liveClass) {
      return NextResponse.json({ error: "Live class not found" }, { status: 404 })
    }

    // Only teachers and admins can update analytics
    if (session.user.role !== "teacher" && session.user.role !== "admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const body: AnalyticsUpdate = await request.json()
    const { type, data } = body

    if (!type) {
      return NextResponse.json({ error: "Analytics type is required" }, { status: 400 })
    }

    // Update analytics based on type
    switch (type) {
      case 'viewer_join':
        zenStreamService.incrementViewerCount(liveClass.streamId)
        break
      case 'viewer_leave':
        zenStreamService.decrementViewerCount(liveClass.streamId)
        break
      case 'chat_message':
        zenStreamService.updateStreamAnalytics(liveClass.streamId, {
          chatMessages: (zenStreamService.getStreamAnalytics(liveClass.streamId)?.chatMessages || 0) + 1
        })
        break
      case 'quality_switch':
        zenStreamService.updateStreamAnalytics(liveClass.streamId, {
          qualitySwitches: (zenStreamService.getStreamAnalytics(liveClass.streamId)?.qualitySwitches || 0) + 1
        })
        break
      case 'buffering':
        zenStreamService.updateStreamAnalytics(liveClass.streamId, {
          bufferingEvents: (zenStreamService.getStreamAnalytics(liveClass.streamId)?.bufferingEvents || 0) + 1
        })
        break
      case 'error':
        zenStreamService.updateStreamAnalytics(liveClass.streamId, {
          errors: (zenStreamService.getStreamAnalytics(liveClass.streamId)?.errors || 0) + 1
        })
        break
      default:
        return NextResponse.json({ error: "Invalid analytics type" }, { status: 400 })
    }

    return NextResponse.json({
      message: "Analytics updated successfully",
      type,
      timestamp: new Date()
    })

  } catch (error) {
    console.error("Error updating analytics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 