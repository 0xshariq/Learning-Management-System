import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { dbConnect } from "@/lib/dbConnect"
import { Video, videoValidationSchema } from "@/models/video"
import { Course } from "@/models/course"


export async function POST(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    // Check if course exists and user is the teacher
    const course = await Course.findById(params.courseId)

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    if (course.teacher.toString() !== session.user.id) {
      return NextResponse.json({ error: "You are not authorized to add videos to this course" }, { status: 403 })
    }

    const body = await request.json()

    // Validate request body
    const validationResult = videoValidationSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error.errors }, { status: 400 })
    }

    const videoData = validationResult.data

    // Create new video
    const video = new Video({
      title: videoData.title,
      description: videoData.description,
      url: videoData.url,
      course: params.courseId,
      position: videoData.position,
      duration: videoData.duration,
      captionsUrl: videoData.captionsUrl,
    })

    await video.save()

    return NextResponse.json(video, { status: 201 })
  } catch (error) {
    console.error("Error creating video:", error)
    return NextResponse.json({ error: "Failed to create video" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    await dbConnect()

    const videos = await Video.find({ course: params.courseId }).sort({ position: 1 }).lean()

    return NextResponse.json(videos)
  } catch (error) {
    console.error("Error fetching videos:", error)
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 })
  }
}
