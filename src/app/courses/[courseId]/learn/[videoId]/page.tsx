import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  CheckCircle,
  BookOpen,
  Clock,
  Download,
  Share2,
  Bookmark,
  MessageSquare,
  Eye,
  Volume2,
  Settings,
  Maximize,
  SkipBack,
  SkipForward,
  Pause,
  Play,
  RotateCcw,
  FileText,
  Lightbulb,
  Target,
  Award,
  BarChart3,
  Calendar,
  User,
  Star,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Share,
  Copy,
  ExternalLink,
  BookmarkPlus,
  BookmarkCheck,
  DownloadCloud,
  Headphones,
  Video,
  FileVideo,
  CheckSquare,
  Square,
  AlertCircle,
  Info,
  HelpCircle,
  Zap,
  TrendingUp,
  Users,
  Timer,
  Target as TargetIcon,
  Award as AwardIcon,
  BarChart3 as BarChart3Icon,
  Calendar as CalendarIcon,
  User as UserIcon,
  Star as StarIcon,
  ThumbsUp as ThumbsUpIcon,
  ThumbsDown as ThumbsDownIcon,
  Flag as FlagIcon,
  Share as ShareIcon,
  Copy as CopyIcon,
  ExternalLink as ExternalLinkIcon,
  BookmarkPlus as BookmarkPlusIcon,
  BookmarkCheck as BookmarkCheckIcon,
  DownloadCloud as DownloadCloudIcon,
  Headphones as HeadphonesIcon,
  Video as VideoIcon,
  FileVideo as FileVideoIcon,
  CheckSquare as CheckSquareIcon,
  Square as SquareIcon,
  AlertCircle as AlertCircleIcon,
  Info as InfoIcon,
  HelpCircle as HelpCircleIcon,
  Zap as ZapIcon,
  TrendingUp as TrendingUpIcon,
  Users as UsersIcon,
  Timer as TimerIcon,
} from "lucide-react";
import { dbConnect } from "@/lib/dbConnect";
import { Course as CourseModel } from "@/models/course";
import { Video as VideoModel } from "@/models/video";
import { Student } from "@/models/student";
import { CourseProgress } from "@/models/course-progress";
import VideoPlayer from "@/components/video/video-player";
import type mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

// --- Types ---
interface TeacherType {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  email?: string;
  avatar?: string;
}

type VideoType = {
  _id: string;
  title: string;
  description?: string;
  url: string;
  course: string;
  position: number;
  duration?: string;
  isCurrent?: boolean;
  captionsUrl?: string;
  thumbnail?: string;
  views?: number;
  likes?: number;
  dislikes?: number;
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  resources?: {
    title: string;
    url: string;
    type: 'pdf' | 'video' | 'link' | 'download';
  }[];
};

type CourseType = {
  _id: string;
  name: string;
  description: string;
  syllabus?: string;
  price: number;
  duration: string;
  teacher: TeacherType;
  imageUrl?: string;
  isPublished: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  totalStudents?: number;
  averageRating?: number;
  totalReviews?: number;
  category?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  certificate?: boolean;
  language?: string;
};

type VideoAndCourseData = {
  currentVideo: VideoType;
  course: CourseType;
  videos: VideoType[];
  progress: {
    completedVideos: string[];
    percentageCompleted: number;
    totalVideos: number;
    currentVideoIndex: number;
  };
};

// --- Data Fetching Helpers ---
async function getVideoAndCourse(
  videoId: string,
  courseId: string,
  userId?: string
): Promise<VideoAndCourseData | null> {
  await dbConnect();

  try {
    const video = await VideoModel.findById(videoId).lean();
    if (!video || video.course.toString() !== courseId) {
      return null;
    }

    const course = await CourseModel.findById(courseId)
      .populate<{ teacher: TeacherType }>("teacher", "name email avatar")
      .lean();
    if (!course) {
      return null;
    }

    const videos = await VideoModel.find({ course: courseId })
      .sort({ position: 1 })
      .lean();

    // Get progress if user is logged in
    let progress = {
      completedVideos: [] as string[],
      percentageCompleted: 0,
      totalVideos: videos.length,
      currentVideoIndex: videos.findIndex(v => v._id.toString() === videoId)
    };

    if (userId) {
      const userProgress = await CourseProgress.findOne({
        student: userId,
        course: courseId,
      }).lean();

      if (userProgress) {
        progress.completedVideos = userProgress.completedVideos.map(id => id.toString());
        progress.percentageCompleted = userProgress.percentageCompleted;
      }
    }

    return {
      currentVideo: {
        ...video,
        _id: video._id.toString(),
        course: video.course.toString(),
        views: video.views || 0,
        likes: video.likes || 0,
        dislikes: video.dislikes || 0,
        tags: video.tags || [],
        difficulty: video.difficulty || 'beginner',
        resources: video.resources || [],
      },
      course: {
        _id: course._id.toString(),
        name: course.name,
        description: course.description,
        price: course.price,
        duration: course.duration,
        teacher: {
          _id: course.teacher._id.toString(),
          name: course.teacher.name,
          email: course.teacher.email,
          avatar: course.teacher.avatar,
        },
        imageUrl: course.imageUrl || "",
        syllabus: course.syllabus || "",
        isPublished: course.isPublished,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        totalStudents: course.totalStudents || 0,
        averageRating: course.averageRating || 0,
        totalReviews: course.totalReviews || 0,
        category: course.category || 'General',
        level: course.level || 'beginner',
        certificate: course.certificate || false,
        language: course.language || 'English',
      },
      videos: videos.map(
        (v: VideoType): VideoType => ({
          ...v,
          _id: v._id.toString(),
          course: v.course.toString(),
          isCurrent: v._id.toString() === videoId,
          views: v.views || 0,
          likes: v.likes || 0,
          dislikes: v.dislikes || 0,
          tags: v.tags || [],
          difficulty: v.difficulty || 'beginner',
          resources: v.resources || [],
        })
      ),
      progress,
    };
  } catch (error) {
    console.error("Error fetching video and course:", error);
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
    const student = await Student.findById(userId);
    return student?.purchasedCourses?.includes(courseId) || false;
  } catch (error) {
    console.error("Error checking enrollment status:", error);
    return false;
  }
}

async function updateProgress(
  userId: string,
  courseId: string,
  videoId: string
) {
  await dbConnect();

  try {
    let progress = await CourseProgress.findOne({
      student: userId,
      course: courseId,
    });

    if (!progress) {
      progress = new CourseProgress({
        student: userId,
        course: courseId,
        completedVideos: [],
        percentageCompleted: 0,
      });
    }

    if (!progress.completedVideos.includes(videoId)) {
      progress.completedVideos.push(videoId);
    }

    const totalVideos = await VideoModel.countDocuments({ course: courseId });
    progress.percentageCompleted =
      (progress.completedVideos.length / totalVideos) * 100;

    await progress.save();
    return progress;
  } catch (error) {
    console.error("Error updating progress:", error);
    return null;
  }
}

// --- Main Page ---
export default async function LearnPage(
  { params }: { params: { courseId: string; videoId: string } }
) {
  const { courseId, videoId } = params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="max-w-md mx-auto">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="mb-6 text-muted-foreground">You need to be signed in to access this course.</p>
          <Link href="/student/signin">
            <Button className="w-full">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isEnrolled = await checkEnrollmentStatus(courseId, session.user.id);

  if (!isEnrolled) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="max-w-md mx-auto">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-4">Enrollment Required</h1>
          <p className="mb-6 text-muted-foreground">
            You need to enroll in this course to access the content.
          </p>
          <Link href={`/courses/${courseId}`}>
            <Button className="w-full">View Course Details</Button>
          </Link>
        </div>
      </div>
    );
  }

  const data = await getVideoAndCourse(videoId, courseId, session.user.id);

  if (!data) {
    notFound();
  }

  const { currentVideo, videos, course, progress } = data;

  await updateProgress(session.user.id, courseId, videoId);

  const currentIndex = videos.findIndex((v) => v._id === videoId);
  const prevVideo = currentIndex > 0 ? videos[currentIndex - 1] : null;
  const nextVideo =
    currentIndex < videos.length - 1 ? videos[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href={`/courses/${courseId}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                ← Back to course
              </Link>
              <Separator orientation="vertical" className="h-4" />
              <div>
                <h1 className="text-sm font-medium text-muted-foreground">{course.name}</h1>
                <p className="text-xs text-muted-foreground">
                  Video {currentIndex + 1} of {videos.length}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {currentVideo.duration || 'Unknown duration'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                {currentVideo.views || 0} views
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Target className="w-3 h-3 mr-1" />
                {currentVideo.difficulty || 'beginner'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Video Player */}
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
                {currentVideo.url ? (
                  <VideoPlayer
                    videoUrl={currentVideo.url}
                    title={currentVideo.title}
                    videoId={currentVideo._id}
                    courseId={courseId}
                    description={currentVideo.description || ""}
                    courseVideos={videos.map((v) => ({
                      id: v._id,
                      title: v.title,
                      position: v.position,
                      isCurrent: v.isCurrent ?? false,
                    }))}
                    onProgress={(progress) => {
                      // Handle progress updates
                      console.log('Video progress:', progress);
                    }}
                    onQualityChange={(quality) => {
                      console.log('Quality changed to:', quality);
                    }}
                    onError={(error) => {
                      console.error('Video error:', error);
                    }}
                    onAnalytics={(analytics) => {
                      console.log('Video analytics:', analytics);
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white bg-muted">
                    <div className="text-center">
                      <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium">Video not available</p>
                      <p className="text-sm text-muted-foreground">This video is currently unavailable</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Video Info */}
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold mb-2">{currentVideo.title}</h1>
                    {currentVideo.description && (
                      <p className="text-muted-foreground leading-relaxed">
                        {currentVideo.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm">
                            <BookmarkPlus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Bookmark this video</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Share video</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download video</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Video Stats */}
                <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <ThumbsUp className="h-4 w-4" />
                    <span>{currentVideo.likes || 0}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ThumbsDown className="h-4 w-4" />
                    <span>{currentVideo.dislikes || 0}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>0 comments</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{currentVideo.views || 0} views</span>
                  </div>
                </div>

                {/* Tags */}
                {currentVideo.tags && currentVideo.tags.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Tags:</span>
                    {currentVideo.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Course Progress */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Course Progress</h3>
                  <span className="text-sm text-muted-foreground">
                    {progress.completedVideos.length} of {progress.totalVideos} videos completed
                  </span>
                </div>
                <Progress value={progress.percentageCompleted} className="mb-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {Math.round(progress.percentageCompleted)}% complete
                  </span>
                  <span className="text-muted-foreground">
                    {progress.totalVideos - progress.completedVideos.length} videos remaining
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              {prevVideo ? (
                <Link href={`/courses/${courseId}/learn/${prevVideo._id}`}>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </Button>
                </Link>
              ) : (
                <div />
              )}

              {nextVideo && (
                <Link href={`/courses/${courseId}/learn/${nextVideo._id}`}>
                  <Button className="flex items-center space-x-2">
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>

            {/* Resources */}
            {currentVideo.resources && currentVideo.resources.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Additional Resources</h3>
                  <div className="space-y-3">
                    {currentVideo.resources.map((resource, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{resource.title}</p>
                            <p className="text-sm text-muted-foreground capitalize">{resource.type}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Course Content */}
              <Card>
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Course Content</h3>
                  <p className="text-sm text-muted-foreground">
                    {videos.length} videos • {course.duration}
                  </p>
                </div>

                <div className="max-h-[600px] overflow-y-auto">
                  {videos.map((video, index) => (
                    <Link
                      key={video._id}
                      href={`/courses/${courseId}/learn/${video._id}`}
                      className={`block transition-colors ${
                        video.isCurrent 
                          ? "bg-primary/10 border-l-2 border-primary" 
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="p-4 flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {video.isCurrent ? (
                            <PlayCircle className="h-5 w-5 text-primary" />
                          ) : progress.completedVideos.includes(video._id) ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground flex items-center justify-center">
                              <span className="text-xs font-medium">{index + 1}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{video.title}</h4>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            {video.duration && (
                              <span>{video.duration}</span>
                            )}
                            {video.difficulty && (
                              <Badge variant="outline" className="text-xs">
                                {video.difficulty}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>

              {/* Course Info */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={course.teacher.avatar} />
                      <AvatarFallback>{course.teacher.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{course.teacher.name}</p>
                      <p className="text-sm text-muted-foreground">Instructor</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Level</span>
                      <Badge variant="outline">{course.level}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Category</span>
                      <span>{course.category}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Language</span>
                      <span>{course.language}</span>
                    </div>
                    {course.certificate && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Certificate</span>
                        <Award className="h-4 w-4 text-primary" />
                      </div>
                    )}
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