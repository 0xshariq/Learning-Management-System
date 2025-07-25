import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { LiveClass, liveClassValidationSchema } from "@/models/live-class"
import { Course } from "@/models/course"
import { Student } from "@/models/student"
import { Teacher } from "@/models/teacher"
import { generateStreamCredentials } from "@/lib/zenstream"

// Helper function to serialize live class data
function serializeLiveClass(liveClass: any) {
  return {
    _id: liveClass._id.toString(),
    course: liveClass.course ? {
      _id: liveClass.course._id.toString(),
      title: liveClass.course.title,
      description: liveClass.course.description
    } : null,
    teacher: liveClass.teacher ? {
      _id: liveClass.teacher._id.toString(),
      name: liveClass.teacher.name,
      email: liveClass.teacher.email
    } : null,
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
  }
}

// Helper function to check if teacher can access live class
async function validateTeacherAccess(teacherId: string, liveClassId?: string) {
  const teacher = await Teacher.findById(teacherId).lean()
  if (!teacher) {
    throw new Error("Teacher not found")
  }
  
  if (teacher.isBlocked) {
    throw new Error("Teacher account is blocked")
  }

  if (liveClassId) {
    const liveClass = await LiveClass.findById(liveClassId).lean()
    if (!liveClass) {
      throw new Error("Live class not found")
    }
    
    if (liveClass.teacher.toString() !== teacherId) {
      throw new Error("You can only access your own live classes")
    }
    
    return { teacher, liveClass }
  }
  
  return { teacher }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const body = await request.json()
    const validatedData = liveClassValidationSchema.parse(body)

    // Validate teacher access and existence
    const { teacher } = await validateTeacherAccess(session.user.id)

    const course = await Course.findById(validatedData.course).lean()
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
    }).lean()

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

    if (!populatedLiveClass) {
      return NextResponse.json({ error: "Failed to create live class" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Live class scheduled successfully",
      liveClass: serializeLiveClass(populatedLiveClass)
    })

  } catch (error) {
    console.error("Error creating live class:", error)
    
    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        return NextResponse.json({ error: "Invalid input data", details: error.message }, { status: 400 })
      }
      
      if (error.message.includes("not found") || error.message.includes("blocked")) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      
      if (error.message.includes("access")) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
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
      // Validate teacher access
      await validateTeacherAccess(session.user.id)
      query.teacher = session.user.id
    } else if (session.user.role === "student") {
      const student = await Student.findById(session.user.id).lean()
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
    } else if (session.user.role === "admin") {
      // Admin can see all live classes
      // No additional query filters needed
    } else {
      return NextResponse.json({ error: "Invalid role" }, { status: 403 })
    }

    if (courseId) {
      query.course = courseId
    }

    const liveClasses = await LiveClass.find(query)
      .populate('course', 'title description')
      .populate('teacher', 'name email')
      .sort({ scheduledDate: -1 })
      .lean()

    return NextResponse.json({ 
      liveClasses: liveClasses.map(serializeLiveClass)
    })

  } catch (error) {
    console.error("Error fetching live classes:", error)
    
    if (error instanceof Error) {
      if (error.message.includes("not found") || error.message.includes("blocked")) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      
      if (error.message.includes("access")) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const body = await request.json()
    const { liveClassId, ...updateData } = body

    if (!liveClassId) {
      return NextResponse.json({ error: "Live class ID is required" }, { status: 400 })
    }

    // Validate access for teachers (admin can update any)
    if (session.user.role === "teacher") {
      const { liveClass } = await validateTeacherAccess(session.user.id, liveClassId)
      
      // Prevent updating if live class is currently live
      if (liveClass.isLive || liveClass.status === 'live') {
        return NextResponse.json({ error: "Cannot update a live class that is currently in progress" }, { status: 400 })
      }
    } else {
      // For admin, just check if live class exists
      const liveClass = await LiveClass.findById(liveClassId).lean()
      if (!liveClass) {
        return NextResponse.json({ error: "Live class not found" }, { status: 404 })
      }
    }

    // If updating scheduled date, check for conflicts
    if (updateData.scheduledDate) {
      const existingClass = await LiveClass.findById(liveClassId).lean()
      if (existingClass && updateData.scheduledDate !== existingClass.scheduledDate.toISOString()) {
        const conflictingClass = await LiveClass.findOne({
          _id: { $ne: liveClassId },
          teacher: existingClass.teacher,
          course: existingClass.course,
          scheduledDate: updateData.scheduledDate,
          status: { $ne: 'cancelled' }
        }).lean()

        if (conflictingClass) {
          return NextResponse.json({ 
            error: "A live class is already scheduled at this time" 
          }, { status: 409 })
        }
      }
    }

    // Update the live class
    const updatedLiveClass = await LiveClass.findByIdAndUpdate(
      liveClassId,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    )
      .populate('course', 'title description')
      .populate('teacher', 'name email')
      .lean()

    if (!updatedLiveClass) {
      return NextResponse.json({ error: "Failed to update live class" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Live class updated successfully",
      liveClass: serializeLiveClass(updatedLiveClass)
    })

  } catch (error) {
    console.error("Error updating live class:", error)
    
    if (error instanceof Error) {
      if (error.message.includes("not found") || error.message.includes("blocked")) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      
      if (error.message.includes("access")) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const liveClassId = searchParams.get('id')

    if (!liveClassId) {
      return NextResponse.json({ error: "Live class ID is required" }, { status: 400 })
    }

    // Validate access for teachers (admin can delete any)
    if (session.user.role === "teacher") {
      const { liveClass } = await validateTeacherAccess(session.user.id, liveClassId)
      
      // Prevent deletion if live class is currently live
      if (liveClass.isLive || liveClass.status === 'live') {
        return NextResponse.json({ error: "Cannot delete a live class that is currently in progress" }, { status: 400 })
      }
    } else {
      // For admin, just check if live class exists
      const liveClass = await LiveClass.findById(liveClassId).lean()
      if (!liveClass) {
        return NextResponse.json({ error: "Live class not found" }, { status: 404 })
      }
      
      if (liveClass.isLive || liveClass.status === 'live') {
        return NextResponse.json({ error: "Cannot delete a live class that is currently in progress" }, { status: 400 })
      }
    }

    // Cancel the live class instead of deleting (soft delete)
    const cancelledLiveClass = await LiveClass.findByIdAndUpdate(
      liveClassId,
      { 
        status: 'cancelled',
        updatedAt: new Date()
      },
      { new: true }
    ).lean()

    if (!cancelledLiveClass) {
      return NextResponse.json({ error: "Failed to cancel live class" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Live class cancelled successfully",
      liveClass: {
        _id: cancelledLiveClass._id.toString(),
        status: cancelledLiveClass.status
      }
    })

  } catch (error) {
    console.error("Error cancelling live class:", error)
    
    if (error instanceof Error) {
      if (error.message.includes("not found") || error.message.includes("blocked")) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      
      if (error.message.includes("access")) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
