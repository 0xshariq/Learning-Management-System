import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { LiveClass } from "@/models/live-class"
import { Teacher } from "@/models/teacher"
import { Student } from "@/models/student"
import { generateJWTToken, generateStreamUrls } from "@/lib/zenstream"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const liveClass = await LiveClass.findById(params.id)
      .populate('course', 'title')

    if (!liveClass) {
      return NextResponse.json({ error: "Live class not found" }, { status: 404 })
    }

    let userId: string
    let userRole: 'teacher' | 'student'

    // Verify access and get user info
    if (session.user.role === "teacher") {
      const teacher = await Teacher.findOne({ email: session.user.email })
      if (!teacher || liveClass.teacher.toString() !== teacher._id.toString()) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }
      userId = teacher._id.toString()
      userRole = 'teacher'
    } else if (session.user.role === "student") {
      const student = await Student.findOne({ email: session.user.email })
      if (!student || !student.enrolledCourses.includes(liveClass.course._id)) {
        return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 403 })
      }
      userId = student._id.toString()
      userRole = 'student'

      // Add student to attendees if not already present
      if (!liveClass.attendees.includes(student._id)) {
        await LiveClass.findByIdAndUpdate(params.id, {
          $addToSet: { attendees: student._id }
        })
      }
    } else {
      return NextResponse.json({ error: "Invalid user role" }, { status: 403 })
    }

    // Generate JWT token for stream access
    const token = generateJWTToken(liveClass.streamId, userId, userRole)
    
    // Generate stream URLs with token
    const streamUrls = generateStreamUrls(liveClass.streamId)
    
    // Replace token placeholder with actual token
    const playerUrl = streamUrls.playerUrl.replace('{GENERATED_JWT_TOKEN}', token)
    const chatUrl = streamUrls.chatUrl.replace('{GENERATED_JWT_TOKEN}', token)

    const response = {
      token,
      streamId: liveClass.streamId,
      playerUrl,
      chatUrl,
      serverUrl: streamUrls.serverUrl,
      role: userRole,
      liveClass: {
        title: liveClass.title,
        description: liveClass.description,
        scheduledDate: liveClass.scheduledDate,
        status: liveClass.status,
        isLive: liveClass.isLive
      }
    }

    // Add stream key for teachers only
    if (userRole === 'teacher') {
      response.streamKey = liveClass.streamKey
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("Error generating stream token:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
