import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { dbConnect } from "@/lib/dbConnect"
import { Course } from "@/models/course"
import { courseValidationSchema } from "@/models/course"
import { Teacher } from "@/models/teacher"
import mongoose from "mongoose"
import type * as z from "zod"



type CourseData = z.infer<typeof courseValidationSchema>


export async function POST(req: Request) {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a teacher
    if (session.user.role !== "teacher") {
      return NextResponse.json({ message: "Only teachers can create courses" }, { status: 403 })
    }

    await dbConnect()

    const body = await req.json()

    // Ensure teacher ID is set correctly
    const dataToValidate = {
      ...body,
      teacher: session.user.id,
    }

    const validation = courseValidationSchema.safeParse(dataToValidate)

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: validation.error.format(),
        },
        { status: 400 },
      )
    }

    const data = validation.data

    // Create the course
    const course = await Course.create({
      name: data.name,
      description: data.description,
      syllabus: data.syllabus,
      price: data.price,
      duration: data.duration,
      category: data.category,
      level: data.level,
      teacher: new mongoose.Types.ObjectId(session.user.id),
      imageUrl: data.imageUrl || undefined,
      isPublished: data.isPublished,
      studentsPurchased: [],
      createdAt: new Date(),
    })

    // Update teacher's coursesCreated array
    await Teacher.findByIdAndUpdate(session.user.id, { $push: { coursesCreated: course._id } })

    return NextResponse.json(
      {
        message: "Course created successfully",
        course: {
          _id: (course._id as mongoose.Types.ObjectId | string).toString(),
          name: course.name,
          description: course.description,
          syllabus: course.syllabus,
          price: course.price,
          duration: course.duration,
          category: course.category,
          level: course.level,
          teacher: course.teacher.toString(),
          imageUrl: course.imageUrl,
          isPublished: course.isPublished,
          createdAt: course.createdAt,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating course:", error)
    return NextResponse.json({ message: "Failed to create course", error: (error as Error).message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    await dbConnect()

    // Get query parameters
    const url = new URL(req.url)
    const teacherId = url.searchParams.get("teacherId")
    const isPublished = url.searchParams.get("isPublished")
    const category = url.searchParams.get("category")
    const level = url.searchParams.get("level")

    // Build query
    const query: Record<string, unknown> = {}

    if (teacherId) {
      query.teacher = teacherId
    }

    if (isPublished !== null) {
      query.isPublished = isPublished === "true"
    }

    if (category) {
      query.category = category
    }

    if (level) {
      query.level = level
    }

    // Get courses
    const coursesData = await Course.find(query).populate("teacher", "name email").sort({ createdAt: -1 }).lean()


    // Transform courses to ensure proper serialization
    const serializedCourses = coursesData.map((course) => {
      return {
        _id: (course._id as mongoose.Types.ObjectId | string).toString(),
        name: course.name,
        description: course.description,
        syllabus: course.syllabus,
        price: course.price,
        duration: course.duration,
        category: course.category,
        level: course.level,
        teacher: {
          _id: course.teacher._id.toString(),
          name: course.teacher.name,
          email: course.teacher.email,
        },
        isPublished: course.isPublished,
        createdAt: course.createdAt,
        imageUrl: course.imageUrl,
        studentsPurchased: course.studentsPurchased?.map((id: mongoose.Types.ObjectId) => id.toString()),
      }
    })

    return NextResponse.json({ courses: serializedCourses }, { status: 200 })
  } catch (error) {
    console.error("Error fetching courses:", error)
    return NextResponse.json({ message: "Failed to fetch courses", error: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a teacher or admin
    if (session.user.role !== "teacher" && session.user.role !== "admin") {
      return NextResponse.json({ message: "Only teachers or admins can delete courses" }, { status: 403 })
    }

    await dbConnect()

    const body = await req.json()
    const courseId = body.courseId

    if (!courseId) {
      return NextResponse.json({ message: "Course ID is required" }, { status: 400 })
    }

    // Get the course to check if the teacher is the owner
    const course = await Course.findById(courseId)

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 })
    }

    // If user is a teacher, check if they own the course
    if (session.user.role === "teacher" && course.teacher.toString() !== session.user.id) {
      return NextResponse.json({ message: "You can only delete your own courses" }, { status: 403 })
    }

    // Delete the course
    await Course.findByIdAndDelete(courseId)

    // If user is a teacher, update their coursesCreated array
    if (session.user.role === "teacher") {
      await Teacher.findByIdAndUpdate(session.user.id, { $pull: { coursesCreated: courseId } })
    }

    return NextResponse.json({ message: "Course deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting course:", error)
    return NextResponse.json({ message: "Failed to delete course", error: (error as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a teacher or admin
    if (session.user.role !== "teacher" && session.user.role !== "admin") {
      return NextResponse.json({ message: "Only teachers or admins can update courses" }, { status: 403 })
    }

    await dbConnect()

    const body = await req.json()
    const { courseId, ...updateData } = body

    if (!courseId) {
      return NextResponse.json({ message: "Course ID is required" }, { status: 400 })
    }

    // Get the course to check if the teacher is the owner
    const course = await Course.findById(courseId)

    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 })
    }

    // If user is a teacher, check if they own the course
    if (session.user.role === "teacher" && course.teacher.toString() !== session.user.id) {
      return NextResponse.json({ message: "You can only update your own courses" }, { status: 403 })
    }

    // Update the course
    await Course.findByIdAndUpdate(courseId, updateData)

    return NextResponse.json({ message: "Course updated successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error updating course:", error)
    return NextResponse.json({ message: "Failed to update course", error: (error as Error).message }, { status: 500 })
  }
}
