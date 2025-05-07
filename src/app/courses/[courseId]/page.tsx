import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { getServerSession } from "next-auth/next"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Calendar, User, PlayCircle, CheckCircle, BookOpen } from "lucide-react"
import { dbConnect } from "@/lib/dbConnect"
import { Course } from "@/models/course"
import { Video } from "@/models/video"
import { Student } from "@/models/student"
import RazorpayCheckout from "@/components/payment/razorpay-checkout"
import type mongoose from "mongoose"

// Define interfaces for the data structures
interface Teacher {
  _id: mongoose.Types.ObjectId | string
  name: string
  email?: string
}

interface VideoData {
  _id: mongoose.Types.ObjectId | string
  title: string
  description?: string
  url: string
  course: mongoose.Types.ObjectId | string
  position: number
  duration?: string
  createdAt: Date
  updatedAt: Date
}

interface CourseDetails {
  _id: mongoose.Types.ObjectId | string
  name: string
  description: string
  syllabus?: string
  price: number
  duration: string
  teacher: Teacher
  imageUrl?: string
  isPublished: boolean
  createdAt: string | Date
  updatedAt: string | Date
  videos: VideoData[]
  studentsPurchased?: mongoose.Types.ObjectId[] | string[]
}

async function getCourseDetails(courseId: string): Promise<CourseDetails | null> {
  await dbConnect()

  try {
    // Fetch course with populated teacher information
    const course = await Course.findById(courseId).populate<{ teacher: Teacher }>("teacher", "name email").lean<CourseDetails>()

    if (!course) {
      return null
    }

    // Fetch videos for this course
    const videos = await Video.find({ course: courseId }).sort({ position: 1 }).lean<VideoData[]>()

    return {
      ...course,
      _id: course._id.toString(),
      teacher: {
        _id: course.teacher._id.toString(),
        name: course.teacher.name,
        email: course.teacher.email,
      },
      videos: videos.map((video) => ({
        _id: video._id.toString(),
        title: video.title || "Untitled Video",
        description: video.description || "No description available",
        url: video.url || "",
        course: video.course.toString(),
        position: video.position || 0,
        duration: video.duration || "Unknown",
        createdAt: video.createdAt || new Date(),
        updatedAt: video.updatedAt || new Date(),
      })),
      studentsPurchased: course.studentsPurchased?.map((id) => id.toString()),
    }
  } catch (error) {
    console.error("Error fetching course details:", error)
    return null
  }
}

async function checkEnrollmentStatus(courseId: string, userId?: string): Promise<boolean> {
  if (!userId) return false

  await dbConnect()

  try {
    const student = await Student.findById(userId)
    return student?.purchasedCourses?.includes(courseId) || false
  } catch (error) {
    console.error("Error checking enrollment status:", error)
    return false
  }
}

interface CourseDetailPageProps {
  params: {
    courseId: string
  }
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const courseId = params.courseId
  const course = await getCourseDetails(courseId)
  const session = await getServerSession()

  const isEnrolled = await checkEnrollmentStatus(courseId, session?.user?.id)

  if (!course) {
    notFound()
  }

  // Calculate course stats
  const totalVideos = course.videos?.length || 0
  const totalDuration = course.duration || "Not specified"

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid md:grid-cols-3 gap-8">
        {/* Course Main Content - Left 2/3 */}
        <div className="md:col-span-2 space-y-8">
          {/* Course Header */}
          <div>
            <h1 className="text-3xl font-bold mb-4">{course.name}</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline" className="text-sm">
                <Clock className="mr-1 h-3 w-3" /> {totalDuration}
              </Badge>
              <Badge variant="outline" className="text-sm">
                <PlayCircle className="mr-1 h-3 w-3" /> {totalVideos} videos
              </Badge>
              <Badge variant="outline" className="text-sm">
                <Calendar className="mr-1 h-3 w-3" /> Updated {new Date(course.createdAt).toLocaleDateString()}
              </Badge>
            </div>
            <div className="flex items-center mb-6">
              <User className="h-5 w-5 mr-2 text-muted-foreground" />
              <span>
                Instructor: <span className="font-medium">{course.teacher?.name || "Unknown"}</span>
              </span>
            </div>
          </div>

          {/* Course Image */}
          <div className="relative aspect-video rounded-lg overflow-hidden border">
            <Image
              src={course.imageUrl || `/placeholder.svg?height=400&width=800&text=${encodeURIComponent(course.name)}`}
              alt={course.name}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Course Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
              <TabsTrigger value="instructor">Instructor</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 pt-4">
              <h3 className="text-xl font-semibold">About This Course</h3>
              <div className="prose max-w-none">
                <p>{course.description}</p>
              </div>

              {course.syllabus && (
                <>
                  <h3 className="text-xl font-semibold mt-6">Syllabus</h3>
                  <div className="prose max-w-none">
                    <p>{course.syllabus}</p>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Curriculum Tab */}
            <TabsContent value="curriculum" className="space-y-4 pt-4">
              <h3 className="text-xl font-semibold">Course Content</h3>
              <div className="text-sm text-muted-foreground mb-4">
                {totalVideos} videos • Total {totalDuration}
              </div>

              {course.videos && course.videos.length > 0 ? (
                <div className="space-y-2">
                  {course.videos.map((video, index) => (
                    <Card key={video._id.toString()} className="overflow-hidden">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center mr-3">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium">{video.title}</h4>
                            {video.duration && <p className="text-xs text-muted-foreground">{video.duration}</p>}
                          </div>
                        </div>
                        {isEnrolled ? (
                          <Link href={`/courses/${courseId}/learn/${video._id}`}>
                            <Button size="sm" variant="outline">
                              <PlayCircle className="h-4 w-4 mr-1" /> Watch
                            </Button>
                          </Link>
                        ) : (
                          <PlayCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border rounded-lg">
                  <p className="text-muted-foreground">No videos available for this course yet.</p>
                </div>
              )}
            </TabsContent>

            {/* Instructor Tab */}
            <TabsContent value="instructor" className="space-y-4 pt-4">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 text-primary rounded-full w-16 h-16 flex items-center justify-center text-xl font-bold">
                  {course.teacher?.name?.charAt(0) || "T"}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{course.teacher?.name || "Unknown"}</h3>
                  <p className="text-muted-foreground">{course.teacher?.email || ""}</p>
                </div>
              </div>
              <div className="mt-4">
                <p>
                  This instructor is an expert in their field and has created this course to share their knowledge and
                  experience with students.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Course Sidebar - Right 1/3 */}
        <div className="md:col-span-1">
          <div className="border rounded-lg p-6 sticky top-24 space-y-6">
            <div className="text-3xl font-bold">₹{course.price}</div>

            {isEnrolled ? (
              <div className="space-y-4">
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">You're enrolled in this course</span>
                </div>
                <Link
                  href={
                    course.videos && course.videos.length > 0
                      ? `/courses/${courseId}/learn/${course.videos[0]._id}`
                      : "#"
                  }
                >
                  <Button className="w-full" disabled={!(course.videos && course.videos.length > 0)}>
                    <BookOpen className="mr-2 h-4 w-4" /> Continue Learning
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {session?.user ? (
                  <RazorpayCheckout courseId={courseId.toString()} courseName={course.name} price={course.price} />
                ) : (
                  <Link href="/auth/student/signin">
                    <Button className="w-full">Sign in to Enroll</Button>
                  </Link>
                )}
                <p className="text-sm text-center text-muted-foreground">30-day money-back guarantee</p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold">This course includes:</h3>
              <ul className="space-y-2">
                <li className="flex items-center text-sm">
                  <PlayCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                  {totalVideos} videos
                </li>
                <li className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  {totalDuration} of content
                </li>
                <li className="flex items-center text-sm">
                  <CheckCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                  Full lifetime access
                </li>
                <li className="flex items-center text-sm">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  Access on mobile and desktop
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
