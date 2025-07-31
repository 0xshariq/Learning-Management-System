import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { LiveClass, liveClassValidationSchema } from "@/models/live-class"
import { Course } from "@/models/course"
import { Student } from "@/models/student"
import { Teacher } from "@/models/teacher"
import { zenStreamService } from "@/lib/zenstream"
import { videoStreamingService } from "@/lib/video-streaming"
import { rateLimit } from "@/lib/utils"

// Rate limiting configuration
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

// Helper function to serialize live class data
function serializeLiveClass(liveClass: any) {
  return {
    _id: liveClass._id.toString(),
    course: liveClass.course ? {
      _id: liveClass.course._id.toString(),
      title: liveClass.course.title,
      description: liveClass.course.description,
      thumbnail: liveClass.course.thumbnail,
      price: liveClass.course.price
    } : null,
    teacher: liveClass.teacher ? {
      _id: liveClass.teacher._id.toString(),
      name: liveClass.teacher.name,
      email: liveClass.teacher.email,
      avatar: liveClass.teacher.avatar
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
    updatedAt: liveClass.updatedAt,
    analytics: {
      totalViewers: liveClass.analytics?.totalViewers || 0,
      peakViewers: liveClass.analytics?.peakViewers || 0,
      averageWatchTime: liveClass.analytics?.averageWatchTime || 0,
      chatMessages: liveClass.analytics?.chatMessages || 0
    }
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

// Helper function to validate student enrollment
async function validateStudentEnrollment(studentId: string, courseId: string) {
  const student = await Student.findById(studentId).lean()
  if (!student) {
    throw new Error("Student not found")
  }

  if (student.isBlocked) {
    throw new Error("Student account is blocked")
  }

  const isEnrolled = student.purchasedCourses?.includes(courseId)
  if (!isEnrolled) {
    throw new Error("You are not enrolled in this course")
  }

  return student
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const { success } = await limiter.limit(ip)
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

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
    const streamCredentials = zenStreamService.generateStreamCredentials({
      maxViewers: 100,
      recordingEnabled: true,
      chatEnabled: true,
      adaptiveBitrate: true,
      lowLatency: true
    })

    // Initialize analytics
    const analytics = {
      totalViewers: 0,
      peakViewers: 0,
      averageWatchTime: 0,
      chatMessages: 0,
      qualitySwitches: 0,
      bufferingEvents: 0,
      errors: 0
    }

    const liveClass = new LiveClass({
      ...validatedData,
      teacher: session.user.id,
      streamId: streamCredentials.streamId,
      streamKey: streamCredentials.streamKey,
      chatSecret: streamCredentials.chatSecret,
      analytics
    })

    await liveClass.save()

    const populatedLiveClass = await LiveClass.findById(liveClass._id)
      .populate('course', 'title description thumbnail price')
      .populate('teacher', 'name email avatar')
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
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const sortBy = searchParams.get('sortBy') || 'scheduledDate'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

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
        return NextResponse.json({ 
          liveClasses: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        })
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

    if (status) {
      query.status = status
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit

    // Get total count for pagination
    const total = await LiveClass.countDocuments(query)

    const liveClasses = await LiveClass.find(query)
      .populate('course', 'title description thumbnail price')
      .populate('teacher', 'name email avatar')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limit)
      .lean()

    return NextResponse.json({ 
      liveClasses: liveClasses.map(serializeLiveClass),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
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
      .populate('course', 'title description thumbnail price')
      .populate('teacher', 'name email avatar')
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
