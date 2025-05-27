import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { dbConnect } from "@/lib/dbConnect"
import { Student } from "@/models/student"
import { Teacher } from "@/models/teacher"
import { Course } from "@/models/course"
import { Review } from "@/models/review"
import { AdminProfile } from "@/components/profile/admin-profile"

async function getAdminData() {
  await dbConnect()

  try {
    // Get counts
    const totalStudents = await Student.countDocuments()
    const totalTeachers = await Teacher.countDocuments()
    const totalCourses = await Course.countDocuments()
    const publishedCourses = await Course.countDocuments({ isPublished: true })
    const totalReviews = await Review.countDocuments()

    // Get recent activity
    const recentStudents = await Student.find().sort({ createdAt: -1 }).limit(5).lean()
    const recentTeachers = await Teacher.find().sort({ createdAt: -1 }).limit(5).lean()
    const recentCourses = await Course.find().populate("teacher", "name").sort({ createdAt: -1 }).limit(5).lean()

    // Get revenue data
    const courses = await Course.find().lean()
    const totalRevenue = courses.reduce((sum, course) => {
      const studentCount = course.studentsPurchased?.length || 0
      return sum + course.price * studentCount
    }, 0)

    // Get average rating
    const reviews = await Review.find().lean()
    const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0

    return {
      stats: {
        totalStudents,
        totalTeachers,
        totalCourses,
        publishedCourses,
        totalReviews,
        totalRevenue,
        averageRating,
      },
      recentActivity: {
        students: recentStudents.map((student: any) => ({
          _id: student._id.toString(),
          name: student.name,
          email: student.email,
          createdAt: student.createdAt,
        })),
        teachers: recentTeachers.map((teacher: any) => ({
          _id: teacher._id.toString(),
          name: teacher.name,
          email: teacher.email,
          createdAt: teacher.createdAt,
        })),
        courses: recentCourses.map((course: any) => ({
          _id: course._id.toString(),
          name: course.name,
          teacher: course.teacher?.name || "Unknown",
          isPublished: course.isPublished,
          createdAt: course.createdAt,
        })),
      },
    }
  } catch (error) {
    console.error("Error fetching admin data:", error)
    return null
  }
}

export default async function AdminProfilePage() {
  const session = await getServerSession()

  if (!session?.user || session.user.role !== "admin") {
    redirect("/role")
  }

  const data = await getAdminData()

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Dashboard Error</h1>
          <p className="text-muted-foreground">Unable to load dashboard data.</p>
        </div>
      </div>
    )
  }

  return <AdminProfile data={data} />
}
