import { notFound } from "next/navigation"
import Image from "next/image"
import { getServerSession } from "next-auth/next"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Calendar, User, PlayCircle, BookOpen } from "lucide-react"
import { dbConnect } from "@/lib/dbConnect"
import { Course } from "@/models/course"
import { Video } from "@/models/video"
import { Student } from "@/models/student"
import { Review } from "@/models/review"
import { CourseSyllabus } from "@/components/courses/course-syllabus"
import { CourseReviews } from "@/components/courses/course-review"
import { EnrollmentSection } from "@/components/courses/enrollment-section"
import { VideoUploadModal } from "@/components/teacher/video-upload-modal"
import type mongoose from "mongoose"

interface TeacherData {
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

interface ReviewData {
  _id: string
  rating: number
  comment: string
  student: {
    _id: string
    name: string
  }
  course: string
  createdAt: Date | string
}

interface CourseDetails {
  _id: mongoose.Types.ObjectId | string
  name: string
  description: string
  syllabus?: string
  formattedSyllabus?: string
  price: number
  duration: string
  teacher: TeacherData
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
    const course = await Course.findById(courseId)
      .populate<{ teacher: TeacherData }>("teacher", "name email")
      .lean<CourseDetails>()

    if (!course) {
      return null
    }

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

async function checkTeacherOwnership(courseId: string, userId?: string): Promise<boolean> {
  if (!userId) return false

  await dbConnect()

  try {
    const course = await Course.findById(courseId)
    return course?.teacher?.toString() === userId
  } catch (error) {
    console.error("Error checking teacher ownership:", error)
    return false
  }
}

async function getCourseReviews(courseId: string): Promise<ReviewData[]> {
  await dbConnect()

  try {
    const reviews = await Review.find({ course: courseId }).populate("student", "name").sort({ createdAt: -1 }).lean()

    return reviews.map((review: any) => ({
      _id: review._id.toString(),
      rating: review.rating,
      comment: review.comment,
      student: {
        _id: review.student._id.toString(),
        name: review.student.name,
      },
      course: review.course.toString(),
      createdAt: review.createdAt,
    }))
  } catch (error) {
    console.error("Error fetching course reviews:", error)
    return []
  }
}

interface CourseDetailPageProps {
  params: {
    courseId: string
  }
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { courseId } = await params
  const course = await getCourseDetails(courseId)
  const session = await getServerSession()

  if (!course) {
    notFound()
  }

  const isEnrolled = await checkEnrollmentStatus(courseId, session?.user?.id)
  const isTeacher = session?.user?.role === "teacher" && (await checkTeacherOwnership(courseId, session?.user?.id))
  const reviews = await getCourseReviews(courseId)

  const totalVideos = course.videos?.length || 0
  const totalDuration = course.duration || "Not specified"
  const firstVideoId = course.videos?.[0]?._id

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">
          {/* Course Header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
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

              {/* Teacher Upload Button */}
              {isTeacher && (
                <div className="ml-4">
                  <VideoUploadModal courseId={courseId} onSuccess={() => window.location.reload()} />
                </div>
              )}
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
          </div>

          {/* Course Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
              <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
              <TabsTrigger value="instructor">Instructor</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 pt-6">
              <h3 className="text-xl font-semibold">About This Course</h3>
              <div className="prose max-w-none">
                <p className="text-muted-foreground leading-relaxed">{course.description}</p>
              </div>
            </TabsContent>

            <TabsContent value="syllabus" className="pt-6">
              <CourseSyllabus
                syllabus={course.syllabus || course.description}
                formattedSyllabus={course.formattedSyllabus}
              />
            </TabsContent>

            <TabsContent value="curriculum" className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Course Content</h3>
                <div className="text-sm text-muted-foreground">
                  {totalVideos} videos • {totalDuration}
                </div>
              </div>

              {course.videos && course.videos.length > 0 ? (
                <div className="space-y-3">
                  {course.videos.map((video, index) => (
                    <div
                      key={video._id.toString()}
                      className="border rounded-lg p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium">{video.title}</h4>
                          {video.duration && <p className="text-xs text-muted-foreground">{video.duration}</p>}
                        </div>
                      </div>
                      <PlayCircle className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                  <PlayCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No videos available for this course yet.</p>
                  {isTeacher && (
                    <div className="mt-4">
                      <VideoUploadModal courseId={courseId} onSuccess={() => window.location.reload()} />
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="instructor" className="space-y-4 pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 text-primary rounded-full w-16 h-16 flex items-center justify-center text-xl font-bold">
                  {course.teacher?.name?.charAt(0) || "T"}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{course.teacher?.name || "Unknown"}</h3>
                  <p className="text-muted-foreground">Course Instructor</p>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-muted-foreground leading-relaxed">
                  This instructor is an expert in their field and has created this course to share their knowledge and
                  experience with students. They bring years of practical experience and are committed to helping
                  students achieve their learning goals.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Reviews Section */}
          <CourseReviews
            courseId={courseId}
            courseName={course.name}
            initialReviews={reviews}
            isEnrolled={isEnrolled}
          />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* Enrollment Card */}
            <div className="border rounded-lg p-6 bg-card">
              <EnrollmentSection
                courseId={courseId}
                courseName={course.name}
                price={course.price}
                isEnrolled={isEnrolled}
                hasVideos={totalVideos > 0}
                firstVideoId={firstVideoId?.toString()}
              />
            </div>

            {/* Course Includes */}
            <div className="border rounded-lg p-6 bg-card">
              <h3 className="font-semibold mb-4">This course includes:</h3>
              <ul className="space-y-3">
                <li className="flex items-center text-sm">
                  <PlayCircle className="h-4 w-4 mr-3 text-primary flex-shrink-0" />
                  <span>
                    {totalVideos} video{totalVideos !== 1 ? "s" : ""}
                  </span>
                </li>
                <li className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-3 text-primary flex-shrink-0" />
                  <span>{totalDuration} of content</span>
                </li>
                <li className="flex items-center text-sm">
                  <BookOpen className="h-4 w-4 mr-3 text-primary flex-shrink-0" />
                  <span>Full lifetime access</span>
                </li>
                <li className="flex items-center text-sm">
                  <User className="h-4 w-4 mr-3 text-primary flex-shrink-0" />
                  <span>Access on mobile and desktop</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
