import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { dbConnect } from "@/lib/dbConnect"
import { Course } from "@/models/course"
import { Video } from "@/models/video"
import { z } from "zod"
import type mongoose from "mongoose"

// Schema for course updates
const courseUpdateSchema = z.object({
  name: z.string().min(3, "Course name must be at least 3 characters").optional(),
  description: z.string().min(100, "Description must be at least 100 characters").optional(),
  syllabus: z.string().optional(),
  price: z.number().min(0, "Price cannot be negative").optional(),
  duration: z.string().min(2, "Duration must be specified").optional(),
  imageUrl: z.string().url("Invalid image URL").optional().or(z.literal("")),
  isPublished: z.boolean().optional(),
})

// Define types for the course update data
type CourseUpdateData = z.infer<typeof courseUpdateSchema>

// Define interfaces for MongoDB documents
interface TeacherDocument {
  _id: mongoose.Types.ObjectId
  name: string
  email: string
}

interface CourseDocument {
  _id: mongoose.Types.ObjectId
  name: string
  description: string
  syllabus?: string
  price: number
  duration: string
  teacher: mongoose.Types.ObjectId | TeacherDocument
  imageUrl?: string
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
  studentsPurchased?: mongoose.Types.ObjectId[]
}

interface VideoDocument {
  _id: mongoose.Types.ObjectId
  title: string
  description?: string
  url: string
  course: mongoose.Types.ObjectId
  position: number
  duration?: string
  createdAt: Date
  updatedAt: Date
}

// Define response interfaces
interface CourseResponse {
  _id: string
  name: string
  description: string
  syllabus?: string
  price: number
  duration: string
  teacher: {
    _id: string
    name: string
    email: string
  }
  imageUrl?: string
  isPublished: boolean
  videos: Array<{
    _id: string
    title: string
    description?: string
    url: string
    course: string
    position: number
    duration?: string
    createdAt: string | Date
    updatedAt: string | Date
  }>
  createdAt: string | Date
  updatedAt: string | Date
  studentsPurchased?: string[]
}

interface UpdateResponse {
  message: string
  course: CourseDocument
}

// GET a single course by ID
export async function GET(
  req: Request,
  { params }: { params: { courseId: string } },
): Promise<NextResponse<CourseResponse | { message: string }>> {
  try {
    await dbConnect()
    const courseId = params.courseId

    const course = await Course.findById(courseId)
      .populate<{ teacher: TeacherDocument }>("teacher", "name email")
      .lean()

    if (!course || Array.isArray(course) || typeof course.teacher === "string") {
      return NextResponse.json({ message: "Course not found or teacher not populated" }, { status: 404 })
    }

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 })
    }

    // Get videos for this course
    const videos = await Video.find({ course: courseId }).sort({ position: 1 }).lean<VideoDocument[]>()

    // Convert MongoDB documents to plain objects and stringify ObjectIds
    interface TeacherResponse {
      _id: string
      name: string
      email: string
    }

    interface VideoResponse {
      _id: string
      title: string
      description?: string
      url: string
      course: string
      position: number
      duration?: string
      createdAt: string | Date
      updatedAt: string | Date
    }

    const result: CourseResponse = {
      _id: course._id.toString(),
      name: course.name,
      description: course.description,
      syllabus: course.syllabus,
      price: course.price,
      duration: course.duration,
      teacher: {
        _id: course.teacher._id.toString(),
        name: course.teacher.name,
        email: course.teacher.email,
      } as TeacherResponse,
      imageUrl: course.imageUrl,
      isPublished: course.isPublished,
      videos: videos.map((video): VideoResponse => ({
        _id: video._id.toString(),
        title: video.title,
        description: video.description,
        url: video.url,
        course: video.course.toString(),
        position: video.position,
        duration: video.duration,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt,
      })),
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      studentsPurchased: course.studentsPurchased?.map((id: string): string => id.toString()),
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("Error fetching course:", error)
    return NextResponse.json({ message: "Failed to fetch course" }, { status: 500 })
  }
}

// UPDATE a course
export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string } },
): Promise<NextResponse<UpdateResponse | { message: string; errors?: unknown }>> {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()
    const courseId = params.courseId

    // Get the course
    const course = await Course.findById(courseId)

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 })
    }

    // Check if user is the course teacher or an admin
    if (course.teacher.toString() !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ message: "You don't have permission to update this course" }, { status: 403 })
    }

    const body = await req.json()
    const validation = courseUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ message: "Validation error", errors: validation.error.format() }, { status: 400 })
    }

    const data: CourseUpdateData = validation.data

    // Update the course
    const updatedCourse = await Course.findByIdAndUpdate(courseId, { $set: data }, { new: true }).populate(
      "teacher",
      "name email",
    )

    return NextResponse.json({ message: "Course updated successfully", course: updatedCourse }, { status: 200 })
  } catch (error) {
    console.error("Error updating course:", error)
    return NextResponse.json({ message: "Failed to update course" }, { status: 500 })
  }
}

// DELETE a course
export async function DELETE(
  req: Request,
  { params }: { params: { courseId: string } },
): Promise<NextResponse<{ message: string }>> {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()
    const courseId = params.courseId

    // Get the course
    const course = await Course.findById(courseId)

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 })
    }

    // Check if user is the course teacher or an admin
    if (course.teacher.toString() !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ message: "You don't have permission to delete this course" }, { status: 403 })
    }

    // Delete all videos associated with this course
    await Video.deleteMany({ course: courseId })

    // Delete the course
    await Course.findByIdAndDelete(courseId)

    return NextResponse.json({ message: "Course and associated videos deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting course:", error)
    return NextResponse.json({ message: "Failed to delete course" }, { status: 500 })
  }
}
