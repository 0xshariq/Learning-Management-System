import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { LiveClass, liveClassValidationSchema } from "@/models/live-class"
import { Course } from "@/models/course"
import { Student } from "@/models/student"
import { Teacher } from "@/models/teacher"
import { generateStreamCredentials } from "@/lib/zenstream"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const body = await request.json()
    const validatedData = liveClassValidationSchema.parse(body)

    // Verify the teacher owns the course
    const course = await Course.findById(validatedData.course)
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const teacher = await Teacher.findOne({ email: session.user.email })
    if (!teacher || course.teacher.toString() !== teacher._id.toString()) {
      return NextResponse.json({ error: "You can only create live classes for your own courses" }, { status: 403 })
    }

    // Generate unique stream credentials for this live class
    const streamCredentials = generateStreamCredentials()

    const liveClass = new LiveClass({
      ...validatedData,
      teacher: teacher._id,
      streamId: streamCredentials.streamId,
      streamKey: streamCredentials.streamKey,
      chatSecret: streamCredentials.chatSecret,
    })

    await liveClass.save()

    const populatedLiveClass = await LiveClass.findById(liveClass._id)
      .populate('course', 'title')
      .populate('teacher', 'name email')

    return NextResponse.json({
      message: "Live class scheduled successfully",
      liveClass: populatedLiveClass
    })

  } catch (error) {
    console.error("Error creating live class:", error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: "Invalid input data", details: error }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    const query: Record<string, unknown> = {}

    if (session.user.role === "teacher") {
      const teacher = await Teacher.findOne({ email: session.user.email })
      if (!teacher) {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
      }
      query.teacher = teacher._id
    } else if (session.user.role === "student") {
      const student = await Student.findOne({ email: session.user.email })
      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }
      
      // Only show live classes for courses the student is enrolled in
      const enrolledCourses = student.enrolledCourses
      query.course = { $in: enrolledCourses }
    }

    if (courseId) {
      query.course = courseId
    }

    const liveClasses = await LiveClass.find(query)
      .populate('course', 'title')
      .populate('teacher', 'name email')
      .sort({ scheduledDate: -1 })

    return NextResponse.json({ liveClasses })

  } catch (error) {
    console.error("Error fetching live classes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
