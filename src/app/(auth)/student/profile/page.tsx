import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { dbConnect } from "@/lib/dbConnect"
import { Student } from "@/models/student"
import { Course } from "@/models/course"
import { Review } from "@/models/review"
import { StudentProfile } from "@/components/profile/student-profile"
import { authOptions } from "@/lib/auth"

async function getStudentData(studentId: string) {
  await dbConnect()

  try {
    const student = await Student.findById(studentId).lean()
    if (!student) return null

    const enrolledCourses = await Course.find({
      _id: { $in: student.purchasedCourses || [] },
    })
      .populate("teacher", "name")
      .lean()

    const reviews = await Review.find({ student: studentId }).populate("course", "name").sort({ createdAt: -1 }).lean()

    return {
      student: {
        _id: student._id.toString(),
        name: student.name,
        email: student.email,
        bio: student.bio || "",
        phone: student.phone || "",
        website: student.website || "",
        profileImage: student.profileImage || "",
        createdAt: student.createdAt,
        purchasedCourses: student.purchasedCourses || [],
      },
      enrolledCourses: enrolledCourses.map((course: any) => ({
        _id: course._id.toString(),
        name: course.name,
        description: course.description,
        imageUrl: course.imageUrl,
        price: course.price,
        teacher: {
          name: course.teacher?.name || "Unknown",
        },
      })),
      reviews: reviews.map((review: any) => ({
        _id: review._id.toString(),
        rating: review.rating,
        comment: review.comment,
        course: {
          _id: review.course._id.toString(),
          name: review.course.name,
        },
        createdAt: review.createdAt,
      })),
    }
  } catch (error) {
    console.error("Error fetching student data:", error)
    return null
  }
}

export default async function StudentProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "student") {
    redirect("/role")
  }

  const data = await getStudentData(session.user.id)

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
          <p className="text-muted-foreground">Unable to load your profile data.</p>
        </div>
      </div>
    )
  }

  return <StudentProfile data={data} />
}
