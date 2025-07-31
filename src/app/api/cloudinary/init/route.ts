import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { v2 as cloudinary } from "cloudinary"
import crypto from "crypto"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

interface InitUploadRequest {
  fileName: string
  fileSize: number
  courseId: string
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

    const body: InitUploadRequest = await req.json()
    const { fileName, fileSize, courseId } = body

    if (!fileName || !fileSize || !courseId) {
      return NextResponse.json({ 
        message: "Missing required fields: fileName, fileSize, courseId" 
      }, { status: 400 })
    }

    // Validate file size (max 2GB)
    const maxFileSize = 2 * 1024 * 1024 * 1024 // 2GB
    if (fileSize > maxFileSize) {
      return NextResponse.json({ 
        message: "File size exceeds maximum allowed size of 2GB" 
      }, { status: 400 })
    }

    // Generate unique upload ID
    const uploadId = crypto.randomBytes(16).toString('hex')
    
    // Generate upload preset if not exists
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'course-videos'
    
    // Create folder structure
    const folder = `course-videos/${courseId}/${uploadId}`
    
    // Generate upload URL with proper configuration
    const timestamp = Math.round(new Date().getTime() / 1000)
    const params = {
      folder,
      resource_type: 'video',
      upload_preset: uploadPreset,
      public_id: `${folder}/${fileName.replace(/\.[^/.]+$/, '')}`,
      overwrite: false,
      invalidate: true,
      eager: [
        { width: 1920, height: 1080, crop: 'scale', quality: 'auto' },
        { width: 1280, height: 720, crop: 'scale', quality: 'auto' },
        { width: 854, height: 480, crop: 'scale', quality: 'auto' },
        { width: 640, height: 360, crop: 'scale', quality: 'auto' }
      ],
      eager_async: true,
      eager_notification_url: `${process.env.NEXTAUTH_URL}/api/cloudinary/webhook`,
      chunk_size: 6000000, // 6MB chunks for large files
      resource_type: 'video',
      format: 'mp4',
      quality: 'auto',
      fetch_format: 'auto',
      flags: 'attachment',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      invalidate: true,
      access_mode: 'public',
      type: 'upload',
      backup: true,
      moderation: 'manual',
      categorization: 'google_tagging',
      auto_tagging: 0.6,
      detection: 'adv_face',
      ocr: 'adv_ocr',
      notification_url: `${process.env.NEXTAUTH_URL}/api/cloudinary/webhook`,
      context: {
        courseId,
        uploadId,
        fileName,
        fileSize: fileSize.toString(),
        uploadedBy: session.user.id,
        uploadedAt: new Date().toISOString()
      }
    }

    // Generate signature for secure upload
    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!)

    return NextResponse.json({
      uploadId,
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`,
      uploadPreset,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      signature,
      params: {
        ...params,
        signature
      },
      maxChunkSize: 6000000, // 6MB
      maxRetries: 3,
      timeout: 300000, // 5 minutes
      folder,
      publicId: params.public_id
    }, { status: 200 })

  } catch (error) {
    console.error("Upload initialization error:", error)
    return NextResponse.json({ 
      message: "Failed to initialize upload",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 