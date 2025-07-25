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

    // Check if teacher owns this course
    if (course.teacher.toString() !== session.user.id) {
      return NextResponse.json({ error: "You can only create live classes for your own courses" }, { status: 403 })
    }

    // Check for duplicate live classes at the same time
    const existingLiveClass = await LiveClass.findOne({
      teacher: session.user.id,
      course: validatedData.course,
      scheduledDate: validatedData.scheduledDate,
      status: { $ne: 'cancelled' }
    })

    if (existingLiveClass) {
      return NextResponse.json({ 
        error: "A live class is already scheduled for this course at the same time" 
      }, { status: 409 })
    }

    // Generate unique stream credentials for this live class
    const streamCredentials = generateStreamCredentials()

    const liveClass = new LiveClass({
      ...validatedData,
      teacher: session.user.id,
      streamId: streamCredentials.streamId,
      streamKey: streamCredentials.streamKey,
      chatSecret: streamCredentials.chatSecret,
    })

    await liveClass.save()

    const populatedLiveClass = await LiveClass.findById(liveClass._id)
      .populate('course', 'title description')
      .populate('teacher', 'name email')
      .lean()

    // Serialize the response
    const serializedLiveClass = {
      _id: populatedLiveClass._id.toString(),
      course: {
        _id: populatedLiveClass.course._id.toString(),
        title: populatedLiveClass.course.title,
        description: populatedLiveClass.course.description
      },
      teacher: {
        _id: populatedLiveClass.teacher._id.toString(),
        name: populatedLiveClass.teacher.name,
        email: populatedLiveClass.teacher.email
      },
      title: populatedLiveClass.title,
      description: populatedLiveClass.description,
      scheduledDate: populatedLiveClass.scheduledDate,
      duration: populatedLiveClass.duration,
      isLive: populatedLiveClass.isLive,
      status: populatedLiveClass.status,
      streamId: populatedLiveClass.streamId,
      attendees: populatedLiveClass.attendees?.map((id: any) => id.toString()) || [],
      createdAt: populatedLiveClass.createdAt,
      updatedAt: populatedLiveClass.updatedAt
    }

    return NextResponse.json({
      message: "Live class scheduled successfully",
      liveClass: serializedLiveClass
    })

  } catch (error) {
    console.error("Error creating live class:", error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: "Invalid input data", details: error }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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
      // For teachers, find by their user ID directly
      query.teacher = session.user.id
    } else if (session.user.role === "student") {
      const student = await Student.findById(session.user.id)
      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }
      
      // Only show live classes for courses the student is enrolled in
      if (student.purchasedCourses && student.purchasedCourses.length > 0) {
        query.course = { $in: student.purchasedCourses }
      } else {
        // No enrolled courses, return empty array
        return NextResponse.json({ liveClasses: [] })
      }
    }

    if (courseId) {
      query.course = courseId
    }

    const liveClasses = await LiveClass.find(query)
      .populate('course', 'title description')
      .populate('teacher', 'name email')
      .sort({ scheduledDate: -1 })
      .lean()

    // Serialize the data properly
    const serializedLiveClasses = liveClasses.map(liveClass => ({
      _id: liveClass._id.toString(),
      course: {
        _id: liveClass.course._id.toString(),
        title: liveClass.course.title,
        description: liveClass.course.description
      },
      teacher: {
        _id: liveClass.teacher._id.toString(),
        name: liveClass.teacher.name,
        email: liveClass.teacher.email
      },
      title: liveClass.title,
      description: liveClass.description,
      scheduledDate: liveClass.scheduledDate,
      duration: liveClass.duration,
      isLive: liveClass.isLive,
      status: liveClass.status,
      streamId: liveClass.streamId,
      attendees: liveClass.attendees?.map((id: any) => id.toString()) || [],
      startedAt: liveClass.startedAt,
      endedAt: liveClass.endedAt,
      createdAt: liveClass.createdAt,
      updatedAt: liveClass.updatedAt
    }))

    return NextResponse.json({ liveClasses: serializedLiveClasses })

  } catch (error) {
    console.error("Error fetching live classes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
