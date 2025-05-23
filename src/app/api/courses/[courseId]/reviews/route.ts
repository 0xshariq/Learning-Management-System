import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { dbConnect } from "@/lib/dbConnect"
import { Review } from "@/models/review"
import { Course } from "@/models/course"
import { Student } from "@/models/student"
import { authOptions } from "@/lib/auth"
import mongoose from "mongoose"

export async function GET(req: Request, { params }: { params: { courseId: string } }) {
  try {
    await dbConnect()

    const courseId = params.courseId

    const reviews = await Review.find({ course: courseId }).populate("student", "name").sort({ createdAt: -1 }).lean()

    return NextResponse.json({ reviews }, { status: 200 })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    return NextResponse.json({ message: "Failed to fetch reviews" }, { status: 500 })
  }
}

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

    // Check if the user is enrolled in the course
    const student = await Student.findById(userId)
    if (!student || !student.purchasedCourses?.includes(courseId)) {
      return NextResponse.json({ message: "You must be enrolled in this course to leave a review" }, { status: 403 })
    }

    // Check if the user has already reviewed this course
    const existingReview = await Review.findOne({
      course: courseId,
      student: userId,
    })

    if (existingReview) {
      return NextResponse.json({ message: "You have already reviewed this course" }, { status: 400 })
    }

    const body = await req.json()
    const { rating, comment } = body

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ message: "Rating must be between 1 and 5" }, { status: 400 })
    }

    // Create the review
    const review = await Review.create({
      rating,
      comment,
      course: new mongoose.Types.ObjectId(courseId),
      student: new mongoose.Types.ObjectId(userId),
    })

    // Populate the student information
    const populatedReview = await Review.findById(review._id).populate("student", "name").lean()

    return NextResponse.json(
      {
        message: "Review submitted successfully",
        review: {
          ...populatedReview,
          _id: populatedReview?._id.toString(),
          course: populatedReview?.course.toString(),
          student: {
            _id: populatedReview?.student._id.toString(),
            name: populatedReview?.student.name,
          },
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error submitting review:", error)
    return NextResponse.json({ message: "Failed to submit review" }, { status: 500 })
  }
}
