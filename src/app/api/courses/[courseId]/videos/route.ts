import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Video } from "@/models/video"
import { Course } from "@/models/course"
import { videoStreamingService } from "@/lib/video-streaming"
import { z } from "zod"

interface VideoResponse {
  _id: string
  title: string
  description: string
  url: string
  hlsUrl?: string
  duration: string
  position: number
  course: string
  createdAt: Date
  quality?: string
  bitrate?: number
  resolution?: string
  isProcessed?: boolean
}

interface VideoLean {
  _id: string | { toString(): string }
  title: string
  description: string
  url: string
  hlsUrl?: string
  duration: string
  position: number
  course: string | { toString(): string }
  createdAt: Date
  quality?: string
  bitrate?: number
  resolution?: string
  isProcessed?: boolean
}

interface VideosResponse {
  videos: VideoResponse[]
}

const videoSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  url: z.string().url("Please provide a valid video URL"),
  duration: z.string().optional(),
  position: z.number().min(0, "Position must be a positive number").optional(),
  quality: z.enum(['low', 'medium', 'high', 'adaptive']).optional(),
  bitrate: z.number().optional(),
  resolution: z.string().optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    // Check authentication
    if (!session?.user) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 })
    }

    // Check if user is a teacher
    if (session.user.role !== "teacher") {
      return NextResponse.json(
        {
          message: "Access denied. Only teachers can upload videos.",
          userRole: session.user.role, // Debug info
        },
        { status: 403 },
      )
    }

    const { courseId } = await params
    const body = await request.json()

    // Validate request body
    const validation = videoSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: validation.error.errors.map((err) => ({
            field: err.path[0],
            message: err.message,
          })),
        },
        { status: 400 },
      )
    }

    await dbConnect()

    // Check if course exists and belongs to the teacher
    const course = await Course.findById(courseId)
    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 })
    }

    // Verify teacher owns the course
    if (course.teacher.toString() !== session.user.id) {
      return NextResponse.json(
        {
          message: "Access denied. You can only upload videos to your own courses.",
          courseTeacher: course.teacher.toString(),
          currentUser: session.user.id,
        },
        { status: 403 },
      )
    }

    const { title, description, url, duration, position, quality, bitrate, resolution } = validation.data

    // Get the next position if not provided
    let videoPosition = position
    if (videoPosition === undefined) {
      const lastVideo = await Video.findOne({ course: courseId }).sort({ position: -1 })
      videoPosition = lastVideo ? lastVideo.position + 1 : 0
    }

    // Generate HLS stream for the video if it's a supported format
    let hlsUrl: string | undefined
    let isProcessed = false
    let videoQuality = quality
    let videoBitrate = bitrate
    let videoResolution = resolution

    if (url.match(/\.(mp4|avi|mov|mkv|webm)$/i)) {
      try {
        // Start HLS processing
        const streamConfig = {
          inputUrl: url,
          outputPath: `/videos/${courseId}/${videoPosition}`,
          streamKey: `video-${Date.now()}`,
          quality: quality || 'adaptive',
          bitrate: bitrate || undefined,
          resolution: resolution || undefined,
          framerate: 30
        }

        const streamInfo = await videoStreamingService.startStream(streamConfig)
        hlsUrl = streamInfo.hlsUrl
        isProcessed = true
        videoQuality = streamInfo.quality
        videoBitrate = streamInfo.bitrate
        videoResolution = streamInfo.resolution

        // Stop the stream after processing
        setTimeout(async () => {
          try {
            await videoStreamingService.stopStream(streamInfo.streamId)
          } catch (error) {
            console.error('Error stopping video processing stream:', error)
          }
        }, 5000) // Give it 5 seconds to process

      } catch (error) {
        console.error('Error processing video for HLS:', error)
        // Continue without HLS if processing fails
      }
    }

    // Create the video
    const video = new Video({
      title,
      description: description || "",
      url,
      hlsUrl,
      duration: duration || "Unknown",
      course: courseId,
      position: videoPosition,
      quality: videoQuality,
      bitrate: videoBitrate,
      resolution: videoResolution,
      isProcessed
    })

    await video.save()

    return NextResponse.json(
      {
        message: "Video uploaded successfully",
        video: {
          _id: video._id.toString(),
          title: video.title,
          description: video.description,
          url: video.url,
          hlsUrl: video.hlsUrl,
          duration: video.duration,
          position: video.position,
          course: video.course.toString(),
          quality: video.quality,
          bitrate: video.bitrate,
          resolution: video.resolution,
          isProcessed: video.isProcessed,
          createdAt: video.createdAt,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error uploading video:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await params

    await dbConnect()

    const videos = await Video.find({ course: courseId }).sort({ position: 1 }).lean()

    const videosTyped: VideoLean[] = videos as VideoLean[]

    const response: VideosResponse = {
      videos: videosTyped.map((video: VideoLean): VideoResponse => ({
        _id: typeof video._id === "string" ? video._id : video._id.toString(),
        title: video.title,
        description: video.description,
        url: video.url,
        hlsUrl: video.hlsUrl,
        duration: video.duration,
        position: video.position,
        course: typeof video.course === "string" ? video.course : video.course.toString(),
        quality: video.quality,
        bitrate: video.bitrate,
        resolution: video.resolution,
        isProcessed: video.isProcessed,
        createdAt: video.createdAt,
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching videos:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
