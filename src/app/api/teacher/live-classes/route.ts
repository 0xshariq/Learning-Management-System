import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { LiveClass } from "@/models/live-class"
import { Teacher } from "@/models/teacher"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    await dbConnect()

    // Find the teacher first
    const teacher = await Teacher.findById(session.user.id)
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    // Fetch live classes for this specific teacher only
    const liveClasses = await LiveClass.find({ 
      teacher: teacher._id 
    })
      .populate('course', 'title description')
      .sort({ scheduledDate: -1 })
      .lean()

    // Serialize the data to ensure all ObjectIds are strings
    const serializedLiveClasses = liveClasses.map(liveClass => ({
      _id: liveClass._id.toString(),
      course: {
        _id: liveClass.course._id.toString(),
        title: liveClass.course.title,
        description: liveClass.course.description
      },
      teacher: liveClass.teacher.toString(),
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

    return NextResponse.json({ 
      liveClasses: serializedLiveClasses,
      total: serializedLiveClasses.length 
    })

  } catch (error) {
    console.error("Error fetching teacher live classes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
