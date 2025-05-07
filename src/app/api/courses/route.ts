import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { dbConnect } from "@/lib/dbConnect"
import { Course, courseValidationSchema } from "@/models/course"
import { Teacher } from "@/models/teacher"
import type { z } from "zod"
import type mongoose from "mongoose"

// Define types for the course data
type CourseData = z.infer<typeof courseValidationSchema>

// Define interface for course document
interface CourseDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  name: string
  description: string
  syllabus?: string
  price: number
  duration: string
  teacher: mongoose.Types.ObjectId | string
  imageUrl?: string
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
  studentsPurchased?: mongoose.Types.ObjectId[] | string[]
}

// Define interface for teacher document
interface TeacherDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  name: string
  email: string
}

// Define interface for course response
interface CourseResponse {
  message: string
  course: {
    _id: string
    name: string
    description: string
    syllabus?: string
    price: number
    duration: string
    teacher: string
    imageUrl?: string
    isPublished: boolean
    createdAt: Date
    updatedAt: Date
  }
}

// Define interface for serialized course
interface SerializedCourse {
  _id: string
  name: string
  description: string
  syllabus?: string
  price: number
  duration: string
  teacher: {
    _id: string
    name: string
  }
  imageUrl?: string
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
  studentsPurchased?: string[]
}

// Define interface for courses response
interface CoursesResponse {
  courses: SerializedCourse[]
}

// Define interface for query parameters
interface CourseQuery {
  teacher?: string
  isPublished?: boolean
}

export async function POST(
  req: Request,
): Promise<NextResponse<CourseResponse | { message: string; errors?: unknown }>> {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a teacher
    if (session.user.role !== "teacher") {
      return NextResponse.json({ message: "Only teachers can create courses" }, { status: 403 })
    }

    await dbConnect()

    const body = await req.json()
    const validation = courseValidationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ message: "Validation error", errors: validation.error.format() }, { status: 400 })
    }

    const data: CourseData = validation.data

    // Create the course
    const course = (await Course.create({
      name: data.name,
      description: data.description,
      syllabus: data.syllabus,
      price: data.price,
      duration: data.duration,
      teacher: session.user.id,
      imageUrl: data.imageUrl || undefined,
      isPublished: data.isPublished,
    })) as CourseDocument

    // Update teacher's coursesCreated array
    await Teacher.findByIdAndUpdate(session.user.id, { $push: { coursesCreated: course._id } })

    return NextResponse.json(
      {
        message: "Course created successfully",
        course: {
          _id: course._id.toString(),
          name: course.name,
          description: course.description,
          syllabus: course.syllabus,
          price: course.price,
          duration: course.duration,
          teacher: course.teacher.toString(),
          imageUrl: course.imageUrl,
          isPublished: course.isPublished,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating course:", error)
    return NextResponse.json({ message: "Failed to create course" }, { status: 500 })
  }
}

export async function GET(req: Request): Promise<NextResponse<CoursesResponse | { message: string }>> {
  try {
    await dbConnect()

    // Get query parameters
    const url = new URL(req.url)
    const teacherId = url.searchParams.get("teacherId")
    const isPublished = url.searchParams.get("isPublished")

    // Build query
    const query: CourseQuery = {}

    if (teacherId) {
      query.teacher = teacherId
    }

    if (isPublished !== null) {
      query.isPublished = isPublished === "true"
    }

    // Get courses
    const coursesData = await Course.find(query)
      .populate<{ teacher: TeacherDocument }>("teacher", "name")
      .sort({ createdAt: -1 })
      .lean()

    // Transform courses to ensure proper serialization
    const serializedCourses: SerializedCourse[] = (coursesData as unknown as CourseDocument[]).map((course: CourseDocument) => {
      return {
        _id: course._id.toString(),
        name: course.name,
        description: course.description,
        price: course.price,
        duration: course.duration,
        teacher: {
          _id: typeof course.teacher === "object" && "_id" in course.teacher ? course.teacher._id.toString() : course.teacher.toString(),
          name: typeof course.teacher === "object" && "name" in course.teacher ? course.teacher.name as string : "",
        },
        isPublished: course.isPublished,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        syllabus: course.syllabus,
        imageUrl: course.imageUrl,
        studentsPurchased: course.studentsPurchased?.map((id) => id.toString()),
      }
    })

    return NextResponse.json({ courses: serializedCourses }, { status: 200 })
  } catch (error) {
    console.error("Error fetching courses:", error)
    return NextResponse.json({ message: "Failed to fetch courses" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
): Promise<NextResponse<{ message: string } | { message: string; errors?: unknown }>> {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a teacher or admin
    if (session.user.role !== "teacher" && session.user.role !== "admin") {
      return NextResponse.json({ message: "Only teachers or admins can delete courses" }, { status: 403 })
    }

    await dbConnect()

    const body = await req.json()
    const courseId = body.courseId

    if (!courseId) {
      return NextResponse.json({ message: "Course ID is required" }, { status: 400 })
    }

    // Get the course to check if the teacher is the owner
    const course = await Course.findById(courseId)

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 })
    }

    // If user is a teacher, check if they own the course
    if (session.user.role === "teacher" && course.teacher.toString() !== session.user.id) {
      return NextResponse.json({ message: "You can only delete your own courses" }, { status: 403 })
    }

    // Delete the course
    await Course.findByIdAndDelete(courseId)

    // If user is a teacher, update their coursesCreated array
    if (session.user.role === "teacher") {
      await Teacher.findByIdAndUpdate(session.user.id, { $pull: { coursesCreated: courseId } })
    }

    return NextResponse.json({ message: "Course deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting course:", error)
    return NextResponse.json({ message: "Failed to delete course" }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
): Promise<NextResponse<{ message: string } | { message: string; errors?: unknown }>> {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a teacher
    if (session.user.role !== "teacher") {
      return NextResponse.json({ message: "Only teachers can update courses" }, { status: 403 })
    }

    await dbConnect()

    const body = await req.json()
    const courseId = body.courseId

    if (!courseId) {
      return NextResponse.json({ message: "Course ID is required" }, { status: 400 })
    }

    // Get the course to check if the teacher is the owner
    const course = await Course.findById(courseId)

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 })
    }

    // Check if the teacher owns the course
    if (course.teacher.toString() !== session.user.id) {
      return NextResponse.json({ message: "You can only update your own courses" }, { status: 403 })
    }

    const validation = courseValidationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ message: "Validation error", errors: validation.error.format() }, { status: 400 })
    }

    const data: CourseData = validation.data

    // Update the course
    await Course.findByIdAndUpdate(courseId, data)

    return NextResponse.json({ message: "Course updated successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error updating course:", error)
    return NextResponse.json({ message: "Failed to update course" }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
): Promise<NextResponse<{ message: string } | { message: string; errors?: unknown }>> {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a teacher
    if (session.user.role !== "teacher") {
      return NextResponse.json({ message: "Only teachers can update courses" }, { status: 403 })
    }

    await dbConnect()

    const body = await req.json()
    const courseId = body.courseId

    if (!courseId) {
      return NextResponse.json({ message: "Course ID is required" }, { status: 400 })
    }

    // Get the course to check if the teacher is the owner
    const course = await Course.findById(courseId)

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 })
    }

    // Check if the teacher owns the course
    if (course.teacher.toString() !== session.user.id) {
      return NextResponse.json({ message: "You can only update your own courses" }, { status: 403 })
    }

    const validation = courseValidationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ message: "Validation error", errors: validation.error.format() }, { status: 400 })
    }

    const data: CourseData = validation.data

    // Update the course
    await Course.findByIdAndUpdate(courseId, data)

    return NextResponse.json({ message: "Course updated successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error updating course:", error)
    return NextResponse.json({ message: "Failed to update course" }, { status: 500 })
  }
}
