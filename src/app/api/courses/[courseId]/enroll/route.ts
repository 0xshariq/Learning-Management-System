import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { dbConnect } from "@/lib/dbConnect"
import { Course } from "@/models/course"
import { Student } from "@/models/student"
import { authOptions } from "@/lib/auth"
import mongoose from "mongoose"

export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const courseId = params.courseId
    const userId = session.user.id

    // Check if the course exists
    const course = await Course.findById(courseId)
    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 })
    }

    // Check if the course is free
    if (course.price > 0) {
      return NextResponse.json(
        { message: "This is a paid course. Please complete the payment to enroll." },
        { status: 400 },
      )
    }

    // Check if the user is already enrolled
    const student = await Student.findById(userId)
    if (!student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 })
    }

    if (student.purchasedCourses?.includes(courseId)) {
      return NextResponse.json({ message: "You are already enrolled in this course" }, { status: 400 })
    }

    // Enroll the student
    await Student.findByIdAndUpdate(userId, {
      $push: { purchasedCourses: new mongoose.Types.ObjectId(courseId) },
    })

    // Update the course's studentsPurchased array
    await Course.findByIdAndUpdate(courseId, {
      $push: { studentsPurchased: new mongoose.Types.ObjectId(userId) },
    })

    return NextResponse.json({ message: "Successfully enrolled in the course" }, { status: 200 })
  } catch (error) {
    console.error("Error enrolling in course:", error)
    return NextResponse.json({ message: "Failed to enroll in course" }, { status: 500 })
  }
}
