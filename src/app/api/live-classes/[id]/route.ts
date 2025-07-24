import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { LiveClass, updateLiveClassStatusSchema } from "@/models/live-class"
import { Teacher } from "@/models/teacher"
import { Student } from "@/models/student"

export async function GET(
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
      .populate('teacher', 'name email')
      .lean()

    if (!liveClass) {
      return NextResponse.json({ error: "Live class not found" }, { status: 404 })
    }

    // Check if user has access to this live class
    if (session.user.role === "teacher") {
      const teacher = await Teacher.findOne({ email: session.user.email })
      if (!teacher || liveClass.teacher._id.toString() !== teacher._id.toString()) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }
    } else if (session.user.role === "student") {
      const student = await Student.findOne({ email: session.user.email })
      if (!student || !student.enrolledCourses.includes(liveClass.course._id)) {
        return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 403 })
      }
    }

    // Don't expose sensitive stream credentials to students
    const response = liveClass.toObject()
    if (session.user.role === "student") {
      delete response.streamKey
    }

    return NextResponse.json({ liveClass: response })

  } catch (error) {
    console.error("Error fetching live class:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const body = await request.json()
    const validatedData = updateLiveClassStatusSchema.parse(body)

    const liveClass = await LiveClass.findById(params.id)
    if (!liveClass) {
      return NextResponse.json({ error: "Live class not found" }, { status: 404 })
    }

    // Verify teacher owns this live class
    const teacher = await Teacher.findOne({ email: session.user.email })
    if (!teacher || liveClass.teacher.toString() !== teacher._id.toString()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Update the live class status
    const updateData: Record<string, unknown> = { status: validatedData.status }

    if (validatedData.status === 'live') {
      updateData.isLive = true
      updateData.startedAt = validatedData.startedAt || new Date()
    } else if (validatedData.status === 'ended') {
      updateData.isLive = false
      updateData.endedAt = validatedData.endedAt || new Date()
    }

    const updatedLiveClass = await LiveClass.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).populate('course', 'title').populate('teacher', 'name email').lean()

    return NextResponse.json({
      message: "Live class status updated successfully",
      liveClass: updatedLiveClass
    })

  } catch (error) {
    console.error("Error updating live class:", error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: "Invalid input data", details: error }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const liveClass = await LiveClass.findById(params.id)
    if (!liveClass) {
      return NextResponse.json({ error: "Live class not found" }, { status: 404 })
    }

    // Verify teacher owns this live class
    const teacher = await Teacher.findOne({ email: session.user.email })
    if (!teacher || liveClass.teacher.toString() !== teacher._id.toString()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Can only delete scheduled live classes
    if (liveClass.status === 'live') {
      return NextResponse.json({ error: "Cannot delete a live class that is currently active" }, { status: 400 })
    }

    await LiveClass.findByIdAndDelete(params.id)

    return NextResponse.json({ message: "Live class deleted successfully" })

  } catch (error) {
    console.error("Error deleting live class:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
