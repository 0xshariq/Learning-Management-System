import { notFound } from "next/navigation";
import Image from "next/image";
import { getServerSession } from "next-auth/next";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Calendar,
  User,
  PlayCircle,
  BookOpen,
  Tag,
  Percent,
} from "lucide-react";
import { dbConnect } from "@/lib/dbConnect";
import { Course } from "@/models/course";
import { Video as VideoModel } from "@/models/video";
import { Student } from "@/models/student";
import { Review } from "@/models/review";
import { CourseSyllabus } from "@/components/courses/course-syllabus";
import { CourseReviews } from "@/components/courses/course-review";
import { EnrollmentSection } from "@/components/courses/enrollment-section";
import { VideoUploadModal } from "@/components/teacher/video-upload-modal";
import type mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { EditCourseModal } from "@/components/courses/edit-course-modal";
import { Button } from "@/components/ui/button";
import CourseSales from "@/components/courses/course-sales";
import { Sale } from "@/models/sales";

interface TeacherData {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  email?: string;
}

interface VideoData {
  _id: string;
  title: string;
  description?: string;
  url: string;
  course: string;
  position: number;
  duration?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ReviewStudent {
  _id: string;
  name: string;
}

interface ReviewData {
  _id: string;
  rating: number;
  comment: string;
  student: ReviewStudent;
  course: string;
  createdAt: Date | string;
}

interface CourseDetails {
  _id: string;
  name: string;
  description: string;
  syllabus?: string;
  formattedSyllabus?: string;
  price: number;
  duration: string;
  teacher: TeacherData;
  imageUrl?: string;
  coupon?: {
    code: string;
    discountPercentage?: number;
    discountAmount?: number;
    expiresAt: string | Date;
  };
  isPublished: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  videos: VideoData[];
  studentsPurchased?: string[];
}

interface ResultTeacher {
  _id: string;
  name: string;
  email?: string;
}

interface ResultCourse
  extends Omit<CourseDetails, "videos" | "teacher" | "studentsPurchased"> {
  _id: string;
  teacher: ResultTeacher;
  videos: VideoData[];
  studentsPurchased?: string[];
}

type ResultVideo = {
  _id: string;
  title: string;
  description?: string;
  url: string;
  course: string;
  position: number;
  duration?: string;
  createdAt: Date;
  updatedAt: Date;
};

async function getCourseDetails(
  courseId: string
): Promise<CourseDetails | null> {
  await dbConnect();

  try {
    const course = await Course.findById(courseId)
      .populate<{ teacher: TeacherData }>("teacher", "name email")
      .lean<{
        _id: mongoose.Types.ObjectId;
        name: string;
        description: string;
        syllabus?: string;
        formattedSyllabus?: string;
        price: number;
        duration: string;
        teacher: TeacherData;
        imageUrl?: string;
        coupon?: {
          code: string;
          discountPercentage?: number;
          discountAmount?: number;
          expiresAt: string | Date;
        };
        isPublished: boolean;
        createdAt: Date;
        updatedAt: Date;
        studentsPurchased?: mongoose.Types.ObjectId[];
      }>();

    if (!course) {
      return null;
    }

    const videos = await VideoModel.find({ course: courseId })
      .sort({ position: 1 })
      .lean<
        {
          _id: mongoose.Types.ObjectId;
          title: string;
          description?: string;
          url: string;
          course: mongoose.Types.ObjectId;
          position: number;
          duration?: string;
          createdAt: Date;
          updatedAt: Date;
        }[]
      >();

    const result: ResultCourse = {
      ...course,
      _id: course._id.toString(),
      teacher: {
        _id: course.teacher._id.toString(),
        name: course.teacher.name,
        email: course.teacher.email,
      },
      videos: videos.map(
        (video: VideoData): ResultVideo => ({
          _id: video._id.toString(),
          title: video.title || "Untitled Video",
          description: video.description || "No description available",
          url: video.url || "",
          course: video.course.toString(),
          position: video.position || 0,
          duration: video.duration || "Unknown",
          createdAt: video.createdAt || new Date(),
          updatedAt: video.updatedAt || new Date(),
        })
      ),
      studentsPurchased: course.studentsPurchased?.map(
        (id: mongoose.Types.ObjectId) => id.toString()
      ),
    };

    return result;
  } catch (error) {
    console.error("Error fetching course details:", error);
    return null;
  }
}

async function checkEnrollmentStatus(
  courseId: string,
  userId?: string
): Promise<boolean> {
  if (!userId) return false;

  await dbConnect();

  try {
    const student = await Student.findById(userId).lean<{
      purchasedCourses?: mongoose.Types.ObjectId[];
    }>();
    return (
      student?.purchasedCourses
        ?.map((id: mongoose.Types.ObjectId) => id.toString())
        .includes(courseId) || false
    );
  } catch (error) {
    console.error("Error checking enrollment status:", error);
    return false;
  }
}

async function checkTeacherOwnership(
  courseId: string,
  userId?: string
): Promise<boolean> {
  if (!userId) return false;

  await dbConnect();

  try {
    const course = await Course.findById(courseId).lean<{
      teacher?: mongoose.Types.ObjectId;
    }>();
    return course?.teacher?.toString() === userId;
  } catch (error) {
    console.error("Error checking teacher ownership:", error);
    return false;
  }
}

async function getCourseReviews(courseId: string): Promise<ReviewData[]> {
  await dbConnect();

  try {
    const reviews = await Review.find({ course: courseId })
      .populate<{ student: ReviewStudent }>("student", "name")
      .sort({ createdAt: -1 })
      .lean<
        {
          _id: mongoose.Types.ObjectId;
          rating: number;
          comment: string;
          student: ReviewStudent & { _id: mongoose.Types.ObjectId };
          course: mongoose.Types.ObjectId;
          createdAt: Date;
        }[]
      >();

    return reviews.map(
      (review: {
        _id: mongoose.Types.ObjectId;
        rating: number;
        comment: string;
        student: ReviewStudent & { _id: mongoose.Types.ObjectId };
        course: mongoose.Types.ObjectId;
        createdAt: Date;
      }): ReviewData => ({
        _id: review._id.toString(),
        rating: review.rating,
        comment: review.comment,
        student: {
          _id: review.student._id.toString(),
          name: review.student.name,
        },
        course: review.course.toString(),
        createdAt: review.createdAt,
      })
    );
  } catch (error) {
    console.error("Error fetching course reviews:", error);
    return [];
  }
}

// --- Fetch Sale for the Course and validate with salesSchema ---
async function getActiveSale(courseId: string) {
  await dbConnect();
  try {
    const now = new Date();
    const saleDoc = await Sale.findOne({
      course: courseId,
      saleTime: { $lte: now },
      $or: [{ expiryTime: { $gte: now } }, { expiryTime: null }],
    }).lean();

    if (!saleDoc) return null;

    // Ensure the returned object matches the expected type for CourseSales
    return {
      _id: saleDoc._id.toString(),
      amount: saleDoc.amount,
      saleTime: saleDoc.saleTime?.toISOString(),
      expiryTime: saleDoc.expiryTime ? saleDoc.expiryTime.toISOString() : undefined,
    };
  } catch (error) {
    console.error("Error fetching sale:", error);
    return null;
  }
}

interface CourseDetailPageProps {
  params: {
    courseId: string;
  };
}

export default async function CourseDetailPage(props: CourseDetailPageProps) {
  const { courseId } = props.params;
  const course = await getCourseDetails(courseId);
  const session = await getServerSession(authOptions);

  if (!course) {
    notFound();
  }

  const isEnrolled = await checkEnrollmentStatus(courseId, session?.user?.id);
  const isTeacher =
    session?.user?.role === "teacher" &&
    (await checkTeacherOwnership(courseId, session?.user?.id));
  const reviews = await getCourseReviews(courseId);

  const totalVideos = course.videos?.length || 0;
  const totalDuration = course.duration || "Not specified";
  const firstVideoId = course.videos?.[0]?._id;

  // Get Sale Data (validated)
  const sale = await getActiveSale(courseId);

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
                    <Calendar className="mr-1 h-3 w-3" /> Updated{" "}
                    {new Date(course.createdAt).toLocaleDateString()}
                  </Badge>
                </div>
                <div className="flex items-center mb-6">
                  <User className="h-5 w-5 mr-2 text-muted-foreground" />
                  <span>
                    Instructor:{" "}
                    <span className="font-medium">
                      {course.teacher?.name || "Unknown"}
                    </span>
                  </span>
                </div>
              </div>

              {/* Manage Coupon Button */}
              {isTeacher && (
                <Link href={`/courses/${courseId}/coupon`}>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Tag className="h-4 w-4" /> Manage Coupon
                  </Button>
                </Link>
              )}
              {/* Manage Sales Button */}
              {isTeacher && (
                <Link href={`/courses/${courseId}/sales`}>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-2 ml-2"
                  >
                    <Percent className="h-4 w-4" /> Manage Sales
                  </Button>
                </Link>
              )}
              {/* Edit Course Button */}
              {course && isTeacher && (
                <EditCourseModal courseId={courseId} course={course} />
              )}
              {/* Teacher Upload Button */}
              {isTeacher && (
                <div className="ml-4">
                  <VideoUploadModal courseId={courseId} />
                </div>
              )}
            </div>

            {/* Course Image */}
            <div className="relative aspect-video rounded-lg overflow-hidden border">
              <Image
                src={
                  course.imageUrl ||
                  `/placeholder.svg?height=400&width=800&text=${encodeURIComponent(
                    course.name
                  )}`
                }
                alt={course.name}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* --- Marquee for Sale --- */}
          <CourseSales sale={sale} price={course.price} />

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
                <p className="text-muted-foreground leading-relaxed">
                  {course.description}
                </p>
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
                  {course.videos.map((video: VideoData, index: number) => (
                    <div
                      key={video._id}
                      className="border rounded-lg p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium">{video.title}</h4>
                          {video.description && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {video.description}
                            </p>
                          )}
                          {video.duration && (
                            <p className="text-xs text-muted-foreground">
                              Duration: {video.duration}
                            </p>
                          )}
                        </div>
                      </div>
                      <Link href={`/courses/${courseId}/learn/${video._id}`}>
                        <PlayCircle className="h-5 w-5 text-muted-foreground cursor-pointer" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                  <PlayCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No videos available for this course yet.
                  </p>
                  {isTeacher && (
                    <div className="mt-4">
                      <VideoUploadModal courseId={courseId} />
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
                  <h3 className="text-xl font-semibold">
                    {course.teacher?.name || "Unknown"}
                  </h3>
                  <p className="text-muted-foreground">Course Instructor</p>
                  {course.teacher?.email && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium">Email:</span>{" "}
                      {course.teacher.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <p className="text-muted-foreground leading-relaxed">
                  This instructor is an expert in their field and has created
                  this course to share their knowledge and experience with
                  students. They bring years of practical experience and are
                  committed to helping students achieve their learning goals.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <span className="font-medium">About the Instructor:</span>{" "}
                  <br />
                  {course.teacher?.name
                    ? `${course.teacher.name} is passionate about teaching and dedicated to student success. They have designed this course to be practical, engaging, and accessible for learners of all backgrounds.`
                    : "Our instructors are selected for their expertise and commitment to quality education."}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <span className="font-medium">Contact:</span>{" "}
                  {course.teacher?.email
                    ? `You can reach out to ${course.teacher.name} at ${course.teacher.email} for course-related queries.`
                    : "Contact details will be available soon."}
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
              {/* --- Sale Price Display with Timer and Strikethrough --- */}
              <CourseSales sale={sale} price={course.price} />
              <EnrollmentSection
                courseId={courseId}
                courseName={course.name}
                price={sale ? sale.amount : course.price}
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
  );
}