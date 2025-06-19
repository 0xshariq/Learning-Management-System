import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Course } from "@/models/course"
import { Student } from "@/models/student"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check authentication
    if (!session?.user) {
      return NextResponse.json({ message: "Authentication required. Please sign in to continue." }, { status: 401 })
    }

    // Check if user is a student
    if (session.user.role !== "student") {
      return NextResponse.json(
        {
          message: "Access denied. Only students can enroll in courses.",
          userRole: session.user.role,
        },
        { status: 403 },
      )
    }

    // Check if student is blocked
    if (session.user.isBlocked) {
      return NextResponse.json(
        {
          message: "Your account has been suspended. Please contact support.",
        },
        { status: 403 },
      )
    }

    await dbConnect()

    // Extract courseId from the URL
    const url = request.nextUrl
    const courseId = url.pathname.split("/").filter(Boolean).at(-2) 
    // Validate courseId format
    if (!courseId || typeof courseId !== "string") {
      return NextResponse.json({ message: "Invalid course ID provided." }, { status: 400 })
    }

    const course = await Course.findById(courseId)

    if (!course) {
      return NextResponse.json(
        { message: "Course not found. Please check the course ID and try again." },
        { status: 404 },
      )
    }

    if (!course.isPublished) {
      return NextResponse.json(
        {
          message: "This course is not available for enrollment yet. Please check back later.",
        },
        { status: 400 },
      )
    }

    // For paid courses, you would handle payment here
    if (course.price > 0) {
      return NextResponse.json(
        {
          message: "Payment required for this course. Payment integration coming soon.",
        },
        { status: 400 },
      )
    }

    // Check if student exists
    const student = await Student.findById(session.user.id)
    if (!student) {
      return NextResponse.json(
        {
          message: "Student profile not found. Please contact support.",
        },
        { status: 404 },
      )
    }

    // Check if student is already enrolled
    if (student.purchasedCourses?.includes(courseId)) {
      return NextResponse.json(
        {
          message: "You are already enrolled in this course. Continue learning!",
        },
        { status: 400 },
      )
    }

    // Enroll the student
    await Student.findByIdAndUpdate(session.user.id, {
      $addToSet: { purchasedCourses: courseId },
    })

    await Course.findByIdAndUpdate(courseId, {
      $addToSet: { studentsPurchased: session.user.id },
    })

    return NextResponse.json(
      {
        message: "Successfully enrolled in course! Welcome to your learning journey.",
        courseId,
        courseName: course.name,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error enrolling in course:", error)

    // Handle specific MongoDB errors
    if (error instanceof Error) {
      if (error.message.includes("Cast to ObjectId failed")) {
        return NextResponse.json(
          {
            message: "Invalid course ID format. Please try again.",
          },
          { status: 400 },
        )
      }
    }

    return NextResponse.json(
      {
        message: "An unexpected error occurred. Please try again later.",
      },
      { status: 500 },
    )
  }
}