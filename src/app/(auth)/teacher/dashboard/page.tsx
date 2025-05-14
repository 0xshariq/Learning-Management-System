import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { dbConnect } from "@/lib/dbConnect"
import { Teacher } from "@/models/teacher"
import { Course } from "@/models/course"
import { Payment } from "@/models/payment"
import { Review } from "@/models/review"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BookOpen, DollarSign, Users, Star, Plus } from "lucide-react"

export default async function TeacherDashboard() {
  const session = await getServerSession()

  if (!session || !session.user) {
    redirect("/teacher/signin")
  }

  await dbConnect()

  // Fetch teacher data
  const teacher = await Teacher.findOne({ email: session.user.email }).lean()

  if (!teacher) {
    redirect("/teacher/signin")
  }

  // Fetch courses created by the teacher
  const courses = await Course.find({
    teacher: teacher._id,
  }).lean()

  // Get course IDs
  const courseIds = courses.map((course) => course._id)

  // Fetch payments for teacher's courses
  const payments = await Payment.find({
    course: { $in: courseIds },
    status: "completed",
  }).lean()

  // Calculate total earnings
  const totalEarnings = payments.reduce((sum, payment) => sum + payment.amount, 0)

  // Fetch reviews for teacher's courses
  const reviews = await Review.find({
    course: { $in: courseIds },
  }).lean()

  // Calculate average rating
  const averageRating =
    reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0

  // Count total students
  const uniqueStudentIds = new Set(payments.map((payment) => payment.student.toString()))
  const totalStudents = uniqueStudentIds.size

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
        <Link href="/teacher/courses/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create New Course
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BookOpen className="mr-2 h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{courses.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="mr-2 h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{totalStudents}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="mr-2 h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">₹{totalEarnings.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Star className="mr-2 h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{averageRating.toFixed(1)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-bold mb-4">My Courses</h2>

      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            // Count students for this course
            const courseStudents = payments.filter(
              (payment) => payment.course.toString() === course._id.toString(),
            ).length

            // Get course reviews
            const courseReviews = reviews.filter((review) => review.course.toString() === course._id.toString())

            // Calculate course rating
            const courseRating =
              courseReviews.length > 0
                ? courseReviews.reduce((sum, review) => sum + review.rating, 0) / courseReviews.length
                : 0

            return (
              <Card key={course._id.toString()} className="overflow-hidden">
                <div className="aspect-video relative bg-muted">
                  {course.imageUrl ? (
                    <img
                      src={course.imageUrl || "/placeholder.svg"}
                      alt={course.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-muted">
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-background/80 px-2 py-1 rounded text-xs font-medium">
                    {course.isPublished ? "Published" : "Draft"}
                  </div>
                </div>

                <CardHeader>
                  <CardTitle>{course.name}</CardTitle>
                  <CardDescription>
                    {course.duration} • {courseStudents} students enrolled
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      <span>{courseRating.toFixed(1)}</span>
                      <span className="text-muted-foreground ml-1">({courseReviews.length})</span>
                    </div>
                    <div className="font-medium">₹{course.price}</div>
                  </div>

                  <div className="flex space-x-2">
                    <Link href={`/teacher/courses/${course._id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        Manage
                      </Button>
                    </Link>
                    <Link href={`/courses/${course._id}`} className="flex-1">
                      <Button className="w-full">View</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">No courses created yet</h3>
          <p className="text-muted-foreground mb-4">Create your first course to start teaching</p>
          <Link href="/teacher/courses/create">
            <Button>Create Course</Button>
          </Link>
        </div>
      )}

      <h2 className="text-2xl font-bold mt-12 mb-4">Recent Earnings</h2>

      {payments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Recent payments for your courses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments.slice(0, 5).map((payment) => (
                <div key={payment._id.toString()} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <div className="font-medium">
                      Course:{" "}
                      {courses.find((c) => c._id.toString() === payment.course.toString())?.name || "Unknown Course"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="font-medium">₹{payment.amount.toFixed(2)}</div>
                </div>
              ))}
            </div>

            {payments.length > 5 && (
              <div className="mt-4 text-center">
                <Button variant="link">View All Payments</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-muted-foreground">No payments received yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
