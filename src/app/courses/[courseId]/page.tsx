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
  Star,
  Award,
  Target,
  BarChart3,
  Users,
  Timer,
  CheckCircle,
  Lock,
  Unlock,
  Download,
  Share2,
  BookmarkPlus,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Eye,
  TrendingUp,
  Zap,
  Lightbulb,
  FileText,
  Video,
  Headphones,
  Certificate,
  Globe,
  Languages,
  Clock as ClockIcon,
  Calendar as CalendarIcon,
  User as UserIcon,
  PlayCircle as PlayCircleIcon,
  BookOpen as BookOpenIcon,
  Tag as TagIcon,
  Percent as PercentIcon,
  Star as StarIcon,
  Award as AwardIcon,
  Target as TargetIcon,
  BarChart3 as BarChart3Icon,
  Users as UsersIcon,
  Timer as TimerIcon,
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  Download as DownloadIcon,
  Share2 as ShareIcon,
  BookmarkPlus as BookmarkPlusIcon,
  MessageSquare as MessageSquareIcon,
  ThumbsUp as ThumbsUpIcon,
  ThumbsDown as ThumbsDownIcon,
  Eye as EyeIcon,
  TrendingUp as TrendingUpIcon,
  Zap as ZapIcon,
  Lightbulb as LightbulbIcon,
  FileText as FileTextIcon,
  Video as VideoIcon,
  Headphones as HeadphonesIcon,
  Certificate as CertificateIcon,
  Globe as GlobeIcon,
  Languages as LanguagesIcon,
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
import { SaleMarquee } from "@/components/courses/course-sales";
import { Sale } from "@/models/sales";
import { StudyMaterialSection } from "@/components/courses/study-material-section";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TeacherData {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
  expertise?: string[];
  experience?: number;
  rating?: number;
  totalStudents?: number;
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
  views?: number;
  likes?: number;
  dislikes?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  thumbnail?: string;
  isPreview?: boolean;
  resources?: {
    title: string;
    url: string;
    type: 'pdf' | 'video' | 'link' | 'download';
  }[];
}

interface ReviewStudent {
  _id: string;
  name: string;
  avatar?: string;
}

interface ReviewData {
  _id: string;
  rating: number;
  comment: string;
  student: ReviewStudent;
  course: string;
  createdAt: Date | string;
  helpful?: number;
  notHelpful?: number;
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
  totalStudents?: number;
  averageRating?: number;
  totalReviews?: number;
  category?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  certificate?: boolean;
  language?: string;
  requirements?: string[];
  outcomes?: string[];
  tags?: string[];
  featured?: boolean;
  trending?: boolean;
  lastUpdated?: Date;
  totalLessons?: number;
  totalHours?: number;
  downloadable?: boolean;
  lifetimeAccess?: boolean;
  mobileAccess?: boolean;
  certificateTemplate?: string;
}

interface ResultTeacher {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
  expertise?: string[];
  experience?: number;
  rating?: number;
  totalStudents?: number;
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
  views?: number;
  likes?: number;
  dislikes?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  thumbnail?: string;
  isPreview?: boolean;
  resources?: {
    title: string;
    url: string;
    type: 'pdf' | 'video' | 'link' | 'download';
  }[];
};

interface CourseDetailPageProps {
  params: {
    courseId: string;
  };
}

interface SerializedCourse {
  _id: string;
  name: string;
  description: string;
  syllabus: string;
  price: number;
  duration: string;
  imageUrl: string;
  isPublished: boolean;
}

async function getCourseDetails(
  courseId: string
): Promise<CourseDetails | null> {
  await dbConnect();

  try {
    const course = await Course.findById(courseId)
      .populate<{ teacher: TeacherData }>("teacher", "name email avatar bio expertise experience rating totalStudents")
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
        totalStudents?: number;
        averageRating?: number;
        totalReviews?: number;
        category?: string;
        level?: 'beginner' | 'intermediate' | 'advanced';
        certificate?: boolean;
        language?: string;
        requirements?: string[];
        outcomes?: string[];
        tags?: string[];
        featured?: boolean;
        trending?: boolean;
        lastUpdated?: Date;
        totalLessons?: number;
        totalHours?: number;
        downloadable?: boolean;
        lifetimeAccess?: boolean;
        mobileAccess?: boolean;
        certificateTemplate?: string;
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
          views?: number;
          likes?: number;
          dislikes?: number;
          difficulty?: 'beginner' | 'intermediate' | 'advanced';
          tags?: string[];
          thumbnail?: string;
          isPreview?: boolean;
          resources?: {
            title: string;
            url: string;
            type: 'pdf' | 'video' | 'link' | 'download';
          }[];
        }[]
      >();

    const result: ResultCourse = {
      ...course,
      _id: course._id.toString(),
      teacher: {
        _id: course.teacher._id.toString(),
        name: course.teacher.name,
        email: course.teacher.email,
        avatar: course.teacher.avatar,
        bio: course.teacher.bio,
        expertise: course.teacher.expertise || [],
        experience: course.teacher.experience || 0,
        rating: course.teacher.rating || 0,
        totalStudents: course.teacher.totalStudents || 0,
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
          views: video.views || 0,
          likes: video.likes || 0,
          dislikes: video.dislikes || 0,
          difficulty: video.difficulty || 'beginner',
          tags: video.tags || [],
          thumbnail: video.thumbnail,
          isPreview: video.isPreview || false,
          resources: video.resources || [],
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
  studentId?: string
): Promise<boolean> {
  if (!studentId) return false;

  await dbConnect();

  try {
    const student = await Student.findById(studentId).lean<{
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
  teacherId?: string
): Promise<boolean> {
  if (!teacherId) return false;

  await dbConnect();

  try {
    const course = await Course.findById(courseId).lean<{
      teacher?: mongoose.Types.ObjectId;
    }>();
    return course?.teacher?.toString() === teacherId;
  } catch (error) {
    console.error("Error checking teacher ownership:", error);
    return false;
  }
}

async function getCourseReviews(courseId: string): Promise<ReviewData[]> {
  await dbConnect();

  try {
    const reviews = await Review.find({ course: courseId })
      .populate<{ student: ReviewStudent }>("student", "name avatar")
      .sort({ createdAt: -1 })
      .lean<
        {
          _id: mongoose.Types.ObjectId;
          rating: number;
          comment: string;
          student: ReviewStudent & { _id: mongoose.Types.ObjectId };
          course: mongoose.Types.ObjectId;
          createdAt: Date;
          helpful?: number;
          notHelpful?: number;
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
        helpful?: number;
        notHelpful?: number;
      }): ReviewData => ({
        _id: review._id.toString(),
        rating: review.rating,
        comment: review.comment,
        student: {
          _id: review.student._id.toString(),
          name: review.student.name,
          avatar: review.student.avatar,
        },
        course: review.course.toString(),
        createdAt: review.createdAt,
        helpful: review.helpful || 0,
        notHelpful: review.notHelpful || 0,
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
      expiryTime: saleDoc.expiryTime
        ? saleDoc.expiryTime.toISOString()
        : undefined,
    };
  } catch (error) {
    console.error("Error fetching sale:", error);
    return null;
  }
}

function serializeCourse(course: CourseDetails): SerializedCourse {
  return {
    _id: course._id?.toString() ?? "",
    name: course.name ?? "",
    description: course.description ?? "",
    syllabus: course.syllabus ?? "",
    price: typeof course.price === "number" ? course.price : 0,
    duration: course.duration ?? "",
    imageUrl: course.imageUrl ?? "",
    isPublished: !!course.isPublished,
  };
}

export default async function CourseDetailPage(props: CourseDetailPageProps) {
  const { courseId } = await props.params;
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
  const previewVideos = course.videos?.filter(v => v.isPreview) || [];
  const completedVideos = course.videos?.filter(v => v.views && v.views > 0) || [];

  // Get Sale Data (validated)
  const sale = await getActiveSale(courseId);

  return (
    <div className="min-h-screen bg-background">
      {/* --- Sale Marquee at the very top --- */}
      <SaleMarquee sale={sale} price={course.price} />

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Course Header */}
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {course.featured && (
                      <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-pink-500">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    {course.trending && (
                      <Badge variant="secondary">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Trending
                      </Badge>
                    )}
                    {course.level && (
                      <Badge variant="outline">
                        <Target className="w-3 h-3 mr-1" />
                        {course.level}
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-4xl font-bold mb-4">{course.name}</h1>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                    {course.description}
                  </p>
                  
                  {/* Course Stats */}
                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{totalDuration}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <PlayCircle className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{totalVideos} videos</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{course.totalStudents || 0} students enrolled</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">{course.averageRating?.toFixed(1) || '0'} ({course.totalReviews || 0} reviews)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Updated {new Date(course.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Instructor Info */}
                  <div className="flex items-center space-x-4 p-4 bg-card rounded-lg border">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={course.teacher.avatar} />
                      <AvatarFallback>{course.teacher.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{course.teacher.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {course.teacher.expertise?.join(', ') || 'Course Instructor'}
                      </p>
                      {course.teacher.experience && (
                        <p className="text-xs text-muted-foreground">
                          {course.teacher.experience} years of experience
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">{course.teacher.rating?.toFixed(1) || '0'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{course.teacher.totalStudents || 0} students</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2 ml-4">
                  {isTeacher && (
                    <>
                      <Link href={`/courses/${courseId}/coupon`}>
                        <Button variant="secondary" size="sm" className="w-full">
                          <Tag className="h-4 w-4 mr-2" /> Manage Coupon
                        </Button>
                      </Link>
                      <Link href={`/courses/${courseId}/sales`}>
                        <Button variant="secondary" size="sm" className="w-full">
                          <Percent className="h-4 w-4 mr-2" /> Manage Sales
                        </Button>
                      </Link>
                      <EditCourseModal
                        courseId={courseId}
                        course={serializeCourse(course)}
                      />
                      <VideoUploadModal courseId={courseId} />
                    </>
                  )}
                </div>
              </div>

              {/* Course Image */}
              <div className="relative aspect-video rounded-lg overflow-hidden border shadow-lg">
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
                {previewVideos.length > 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Button size="lg" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                      <PlayCircle className="h-6 w-6 mr-2" />
                      Watch Preview
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Course Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                <TabsTrigger value="instructor">Instructor</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* What you'll learn */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        <span>What you'll learn</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {course.outcomes && course.outcomes.length > 0 ? (
                        <ul className="space-y-3">
                          {course.outcomes.map((outcome, index) => (
                            <li key={index} className="flex items-start space-x-3">
                              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">Learning outcomes will be available soon.</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Requirements */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Target className="h-5 w-5 text-primary" />
                        <span>Requirements</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {course.requirements && course.requirements.length > 0 ? (
                        <ul className="space-y-3">
                          {course.requirements.map((requirement, index) => (
                            <li key={index} className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                              <span className="text-sm">{requirement}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">No specific requirements.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Course Description */}
                <Card>
                  <CardHeader>
                    <CardTitle>About This Course</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <p className="text-muted-foreground leading-relaxed">
                        {course.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Course Features */}
                <Card>
                  <CardHeader>
                    <CardTitle>Course Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <Video className="h-5 w-5 text-primary" />
                        <span className="text-sm">{totalVideos} video lessons</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Clock className="h-5 w-5 text-primary" />
                        <span className="text-sm">{totalDuration} of content</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Download className="h-5 w-5 text-primary" />
                        <span className="text-sm">Downloadable resources</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Certificate className="h-5 w-5 text-primary" />
                        <span className="text-sm">Certificate of completion</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Globe className="h-5 w-5 text-primary" />
                        <span className="text-sm">Full lifetime access</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Headphones className="h-5 w-5 text-primary" />
                        <span className="text-sm">Audio version available</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="curriculum" className="space-y-8 pt-6">
                {/* Course Content */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-semibold">Course Content</h3>
                      <p className="text-muted-foreground">
                        {totalVideos} videos • {totalDuration} • {course.level} level
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {completedVideos.length} completed
                      </Badge>
                      <Badge variant="outline">
                        {previewVideos.length} previews
                      </Badge>
                    </div>
                  </div>

                  {course.videos && course.videos.length > 0 ? (
                    <div className="space-y-3">
                      {course.videos.map((video: VideoData, index: number) => (
                        <div
                          key={video._id}
                          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-medium">{video.title}</h4>
                                  {video.isPreview && (
                                    <Badge variant="secondary" className="text-xs">
                                      Preview
                                    </Badge>
                                  )}
                                  {video.difficulty && (
                                    <Badge variant="outline" className="text-xs">
                                      {video.difficulty}
                                    </Badge>
                                  )}
                                </div>
                                {video.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {video.description}
                                  </p>
                                )}
                                <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                                  {video.duration && (
                                    <span className="flex items-center space-x-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{video.duration}</span>
                                    </span>
                                  )}
                                  {video.views && video.views > 0 && (
                                    <span className="flex items-center space-x-1">
                                      <Eye className="h-3 w-3" />
                                      <span>{video.views} views</span>
                                    </span>
                                  )}
                                  {video.likes && video.likes > 0 && (
                                    <span className="flex items-center space-x-1">
                                      <ThumbsUp className="h-3 w-3" />
                                      <span>{video.likes}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {video.isPreview ? (
                                <Button variant="outline" size="sm">
                                  <PlayCircle className="h-4 w-4 mr-2" />
                                  Preview
                                </Button>
                              ) : isEnrolled ? (
                                <Link href={`/courses/${courseId}/learn/${video._id}`}>
                                  <Button size="sm">
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    Watch
                                  </Button>
                                </Link>
                              ) : (
                                <Button variant="outline" size="sm" disabled>
                                  <Lock className="h-4 w-4 mr-2" />
                                  Locked
                                </Button>
                              )}
                            </div>
                          </div>
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
                </div>

                {/* Study Material Section */}
                <StudyMaterialSection courseId={courseId} isTeacher={!!isTeacher} />
              </TabsContent>

              <TabsContent value="instructor" className="space-y-6 pt-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-6">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={course.teacher.avatar} />
                        <AvatarFallback className="text-2xl">{course.teacher.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-2xl font-semibold mb-2">{course.teacher.name}</h3>
                        <p className="text-muted-foreground mb-4">{course.teacher.bio || 'Expert instructor with years of experience in their field.'}</p>
                        
                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                          <div className="flex items-center space-x-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm">{course.teacher.rating?.toFixed(1) || '0'} Instructor Rating</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-primary" />
                            <span className="text-sm">{course.teacher.totalStudents || 0} Students</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <PlayCircle className="h-4 w-4 text-primary" />
                            <span className="text-sm">{course.teacher.experience || 0} Years Experience</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Award className="h-4 w-4 text-primary" />
                            <span className="text-sm">Expert Instructor</span>
                          </div>
                        </div>

                        {course.teacher.expertise && course.teacher.expertise.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">Areas of Expertise</h4>
                            <div className="flex flex-wrap gap-2">
                              {course.teacher.expertise.map((skill, index) => (
                                <Badge key={index} variant="secondary">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="pt-6">
                <CourseReviews
                  courseId={courseId}
                  courseName={course.name}
                  initialReviews={reviews}
                  isEnrolled={isEnrolled}
                />
              </TabsContent>

              <TabsContent value="resources" className="pt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Resources</CardTitle>
                    <CardDescription>
                      Supplementary materials to enhance your learning experience
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3 p-3 border rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Course Notes</p>
                          <p className="text-sm text-muted-foreground">Comprehensive notes for each lesson</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Download className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Downloadable Resources</p>
                          <p className="text-sm text-muted-foreground">PDFs, templates, and code files</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Headphones className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Audio Versions</p>
                          <p className="text-sm text-muted-foreground">Listen on the go</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Certificate className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Certificate</p>
                          <p className="text-sm text-muted-foreground">Upon completion</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Enrollment Card */}
              <Card>
                <CardContent className="p-6">
                  <EnrollmentSection
                    courseId={courseId}
                    courseName={course.name}
                    price={course.price}
                    isEnrolled={isEnrolled}
                    hasVideos={totalVideos > 0}
                    firstVideoId={firstVideoId?.toString()}
                    sale={sale}
                  />
                </CardContent>
              </Card>

              {/* Course Includes */}
              <Card>
                <CardHeader>
                  <CardTitle>This course includes:</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-center text-sm">
                      <PlayCircle className="h-4 w-4 mr-3 text-primary flex-shrink-0" />
                      <span>{totalVideos} video{totalVideos !== 1 ? "s" : ""}</span>
                    </li>
                    <li className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-3 text-primary flex-shrink-0" />
                      <span>{totalDuration} of content</span>
                    </li>
                    <li className="flex items-center text-sm">
                      <Download className="h-4 w-4 mr-3 text-primary flex-shrink-0" />
                      <span>Downloadable resources</span>
                    </li>
                    <li className="flex items-center text-sm">
                      <Globe className="h-4 w-4 mr-3 text-primary flex-shrink-0" />
                      <span>Full lifetime access</span>
                    </li>
                    <li className="flex items-center text-sm">
                      <Headphones className="h-4 w-4 mr-3 text-primary flex-shrink-0" />
                      <span>Audio version available</span>
                    </li>
                    <li className="flex items-center text-sm">
                      <Certificate className="h-4 w-4 mr-3 text-primary flex-shrink-0" />
                      <span>Certificate of completion</span>
                    </li>
                    <li className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-3 text-primary flex-shrink-0" />
                      <span>Access on mobile and desktop</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Course Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Course Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Students enrolled</span>
                      <span className="font-medium">{course.totalStudents || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Average rating</span>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{course.averageRating?.toFixed(1) || '0'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total reviews</span>
                      <span className="font-medium">{course.totalReviews || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last updated</span>
                      <span className="font-medium">{new Date(course.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}