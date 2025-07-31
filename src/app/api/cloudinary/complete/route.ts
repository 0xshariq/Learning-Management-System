import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { v2 as cloudinary } from "cloudinary"
import { dbConnect } from "@/lib/dbConnect"
import { Video } from "@/models/video"
import type mongoose from "mongoose"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

interface CompleteUploadRequest {
  uploadId: string
  courseId: string
  title: string
  description?: string
  position: number
  tags?: string[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  isPreview?: boolean
  enableComments?: boolean
  enableDownloads?: boolean
  quality?: string
  format?: string
  enableWatermark?: boolean
  enableSubtitles?: boolean
  privacy?: 'public' | 'private' | 'unlisted'
}

interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  format: string
  width: number
  height: number
  resource_type: string
  duration?: number
  bit_rate?: number
  frame_rate?: number
  nb_frames?: number
  [key: string]: string | number | undefined
}

interface VideoDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  title: string
  url: string
  course: mongoose.Types.ObjectId
  position: number
  duration?: string
  description?: string
  tags?: string[]
  difficulty?: string
  isPreview?: boolean
  enableComments?: boolean
  enableDownloads?: boolean
  quality?: string
  format?: string
  enableWatermark?: boolean
  enableSubtitles?: boolean
  privacy?: string
  views?: number
  likes?: number
  dislikes?: number
  thumbnail?: string
  resources?: {
    title: string
    url: string
    type: 'pdf' | 'video' | 'link' | 'download'
  }[]
  createdAt: Date
  updatedAt: Date
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a teacher or admin
    if (session.user.role !== "teacher" && !session.user.isAdmin) {
      return NextResponse.json({ message: "Permission denied" }, { status: 403 })
    }

    const body: CompleteUploadRequest = await req.json()
    const {
      uploadId,
      courseId,
      title,
      description,
      position,
      tags = [],
      difficulty = 'beginner',
      isPreview = false,
      enableComments = true,
      enableDownloads = false,
      quality = 'auto',
      format = 'mp4',
      enableWatermark = false,
      enableSubtitles = false,
      privacy = 'public'
    } = body

    if (!uploadId || !courseId || !title) {
      return NextResponse.json({ 
        message: "Missing required fields: uploadId, courseId, title" 
      }, { status: 400 })
    }

    await dbConnect()

    // Get the uploaded video from Cloudinary
    const folder = `course-videos/${courseId}/${uploadId}`
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      resource_type: 'video',
      max_results: 1
    })

    if (!result.resources || result.resources.length === 0) {
      return NextResponse.json({ 
        message: "No video found for this upload ID" 
      }, { status: 404 })
    }

    const videoResource = result.resources[0] as CloudinaryUploadResult

    // Apply transformations if needed
    let finalUrl = videoResource.secure_url
    let thumbnailUrl = videoResource.secure_url

    // Generate thumbnail if not exists
    if (!videoResource.secure_url.includes('upload/t_')) {
      const thumbnailResult = await cloudinary.url(videoResource.public_id, {
        transformation: [
          { width: 1280, height: 720, crop: 'scale', quality: 'auto' },
          { fetch_format: 'jpg' }
        ]
      })
      thumbnailUrl = thumbnailResult
    }

    // Apply watermark if requested
    if (enableWatermark) {
      finalUrl = await cloudinary.url(videoResource.public_id, {
        transformation: [
          { overlay: 'logo:watermark', width: 200, height: 100, x: 20, y: 20 },
          { quality: 'auto' }
        ]
      })
    }

    // Generate subtitles if requested
    let subtitlesUrl: string | undefined
    if (enableSubtitles) {
      try {
        const subtitleResult = await cloudinary.api.resource(videoResource.public_id, {
          resource_type: 'video',
          fields: 'subtitles'
        })
        if (subtitleResult.subtitles && subtitleResult.subtitles.length > 0) {
          subtitlesUrl = subtitleResult.subtitles[0].url
        }
      } catch (error) {
        console.warn('Failed to generate subtitles:', error)
      }
    }

    // Create video record in database
    const videoData = {
      title,
      url: finalUrl,
      course: courseId,
      position: position || 0,
      description: description || '',
      tags,
      difficulty,
      isPreview,
      enableComments,
      enableDownloads,
      quality,
      format,
      enableWatermark,
      enableSubtitles,
      privacy,
      views: 0,
      likes: 0,
      dislikes: 0,
      thumbnail: thumbnailUrl,
      duration: videoResource.duration ? `${Math.floor(videoResource.duration / 60)}:${(videoResource.duration % 60).toString().padStart(2, '0')}` : undefined,
      resources: enableSubtitles && subtitlesUrl ? [{
        title: 'Subtitles',
        url: subtitlesUrl,
        type: 'download' as const
      }] : []
    }

    const video = await Video.create(videoData) as VideoDocument

    // Update Cloudinary resource with metadata
    await cloudinary.api.update(videoResource.public_id, {
      resource_type: 'video',
      context: {
        videoId: video._id.toString(),
        courseId,
        title,
        difficulty,
        isPreview: isPreview.toString(),
        privacy,
        uploadedBy: session.user.id,
        uploadedAt: new Date().toISOString()
      },
      tags: tags.join(',')
    })

    return NextResponse.json({
      message: "Video uploaded and processed successfully",
      video: {
        id: video._id.toString(),
        title: video.title,
        url: video.url,
        position: video.position,
        duration: video.duration,
        thumbnail: video.thumbnail,
        tags: video.tags,
        difficulty: video.difficulty,
        isPreview: video.isPreview,
        enableComments: video.enableComments,
        enableDownloads: video.enableDownloads,
        quality: video.quality,
        format: video.format,
        privacy: video.privacy,
        views: video.views,
        likes: video.likes,
        dislikes: video.dislikes,
        resources: video.resources,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt
      },
      cloudinary: {
        publicId: videoResource.public_id,
        format: videoResource.format,
        width: videoResource.width,
        height: videoResource.height,
        duration: videoResource.duration,
        bitRate: videoResource.bit_rate,
        frameRate: videoResource.frame_rate,
        frameCount: videoResource.nb_frames
      }
    }, { status: 201 })

  } catch (error) {
    console.error("Video upload completion error:", error)
    return NextResponse.json({ 
      message: "Failed to complete video upload",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 