import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { v2 as cloudinary } from "cloudinary"
import { dbConnect } from "@/lib/dbConnect"
import { Video } from "@/models/video"
import type mongoose from "mongoose"
import { authOptions } from "@/lib/auth"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  format: string
  width: number
  height: number
  resource_type: string
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

    const formData = await req.formData()
    const file = formData.get("file") as File
    const courseId = formData.get("courseId") as string
    const title = formData.get("title") as string
    const position = formData.get("position") as string

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 })
    }

    if (!courseId) {
      return NextResponse.json({ message: "Course ID is required" }, { status: 400 })
    }

    if (!title) {
      return NextResponse.json({ message: "Video title is required" }, { status: 400 })
    }

    await dbConnect()

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to Cloudinary
    return new Promise<NextResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          folder: "course-videos",
        },
        async (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error)
            resolve(NextResponse.json({ message: "Failed to upload video" }, { status: 500 }))
          } else {
            try {
              // Create video record in database
              const uploadResult = result as CloudinaryUploadResult
              const video = (await Video.create({
                title,
                url: uploadResult.secure_url,
                course: courseId,
                position: position ? Number.parseInt(position) : 0,
              })) as VideoDocument

              resolve(
                NextResponse.json(
                  {
                    message: "Video uploaded successfully",
                    video: {
                      id: video._id.toString(),
                      title: video.title,
                      url: video.url,
                      position: video.position,
                    },
                  },
                  { status: 200 },
                ),
              )
              reject(null) // Resolve the promise successfully
            } catch (dbError) {
              console.error("Database error:", dbError)
              resolve(NextResponse.json({ message: "Failed to save video information" }, { status: 500 }))
              reject(dbError)
            }
          }
        },
      )

      uploadStream.write(buffer)
      uploadStream.end()
    })
  } catch (error) {
    console.error("Video upload error:", error)
    return NextResponse.json({ message: "Failed to process video upload" }, { status: 500 })
  }
}
