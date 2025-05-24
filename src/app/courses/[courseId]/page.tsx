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
// import { CourseReviews } from "@/components/courses/course-review"
import { EnrollmentSection } from "@/components/courses/enrollment-section"
import type mongoose from "mongoose"

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
    const course = await Course.findById(courseId)
      .populate<{ teacher: Teacher }>("teacher", "name email")
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

// async function getCourseReviews(courseId: string): Promise<ReviewData[]> {
//   await dbConnect()

//   try {
//     const reviews = await Review.find({ course: courseId }).populate("student", "name").sort({ createdAt: -1 }).lean()

//     return reviews.map((review: any) => ({
//       _id: review._id.toString(),
//       rating: review.rating,
//       comment: review.comment,
//       student: {
//         _id: review.student._id.toString(),
//         name: review.student.name,
//       },
//       course: review.course.toString(),
//       createdAt: review.createdAt,
//     }))
//   } catch (error) {
//     console.error("Error fetching course reviews:", error)
//     return []
//   }
// }

interface CourseDetailPageProps {
  params: {
    courseId: string
  }
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const courseId = await params.courseId
  const course = await getCourseDetails(courseId)
  const session = await getServerSession()

  if (!course) {
    notFound()
  }

  const isEnrolled = await checkEnrollmentStatus(courseId, session?.user?.id)
  // const reviews = await getCourseReviews(courseId)

  const totalVideos = course.videos?.length || 0
  const totalDuration = course.duration || "Not specified"
  const firstVideoId = course.videos?.[0]?._id

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
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

          <div className="relative aspect-video rounded-lg overflow-hidden border">
            <Image
              src={course.imageUrl || `/placeholder.svg?height=400&width=800&text=${encodeURIComponent(course.name)}`}
              alt={course.name}
              fill
              className="object-cover"
              priority
            />
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
              <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
              <TabsTrigger value="instructor">Instructor</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 pt-4">
              <h3 className="text-xl font-semibold">About This Course</h3>
              <div className="prose max-w-none">
                <p>{course.description}</p>
              </div>
            </TabsContent>

            <TabsContent value="syllabus" className="pt-4">
              <CourseSyllabus
                syllabus={course.syllabus || course.description}
                formattedSyllabus={course.formattedSyllabus}
              />
            </TabsContent>

            <TabsContent value="curriculum" className="space-y-4 pt-4">
              <h3 className="text-xl font-semibold">Course Content</h3>
              <div className="text-sm text-muted-foreground mb-4">
                {totalVideos} videos • Total {totalDuration}
              </div>

              {course.videos && course.videos.length > 0 ? (
                <div className="space-y-2">
                  {course.videos.map((video, index) => (
                    <div key={video._id.toString()} className="border rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center mr-3">
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
                <div className="text-center py-8 border rounded-lg">
                  <p className="text-muted-foreground">No videos available for this course yet.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="instructor" className="space-y-4 pt-4">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 text-primary rounded-full w-16 h-16 flex items-center justify-center text-xl font-bold">
                  {course.teacher?.name?.charAt(0) || "T"}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{course.teacher?.name || "Unknown"}</h3>
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

          {/* <CourseReviews
            courseId={courseId.toString()}
            courseName={course.name}
            initialReviews={reviews}
            isEnrolled={isEnrolled}
          /> */}
        </div>

        <div className="md:col-span-1">
          <div className="border rounded-lg p-6 sticky top-24 space-y-6">
            <EnrollmentSection
              courseId={courseId.toString()}
              courseName={course.name}
              price={course.price}
              isEnrolled={isEnrolled}
              hasVideos={totalVideos > 0}
              firstVideoId={firstVideoId?.toString()}
            />

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
                  <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
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
