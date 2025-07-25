import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { LiveClass } from "@/models/live-class"
import { Student } from "@/models/student"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    await dbConnect()

    // Find the student first
    const student = await Student.findById(session.user.id)
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Get student's purchased courses
    const purchasedCourses = student.purchasedCourses || []
    
    if (purchasedCourses.length === 0) {
      return NextResponse.json({ 
        liveClasses: [],
        message: "No enrolled courses found"
      })
    }

    // Fetch live classes for courses the student is enrolled in
    const liveClasses = await LiveClass.find({ 
      course: { $in: purchasedCourses },
      status: { $ne: 'cancelled' }
    })
      .populate('course', 'title description')
      .populate('teacher', 'name email')
      .sort({ scheduledDate: -1 })
      .lean()

    // Serialize the data
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
      attendees: liveClass.attendees?.map((id: any) => id.toString()) || [],
      startedAt: liveClass.startedAt,
      endedAt: liveClass.endedAt,
      createdAt: liveClass.createdAt,
      updatedAt: liveClass.updatedAt
    }))

    return NextResponse.json({ 
      liveClasses: serializedLiveClasses,
      total: serializedLiveClasses.length 
    })

  } catch (error) {
    console.error("Error fetching student live classes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
