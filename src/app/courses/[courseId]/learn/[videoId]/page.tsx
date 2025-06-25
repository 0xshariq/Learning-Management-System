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
} from "lucide-react";
import { dbConnect } from "@/lib/dbConnect";
import { Course as CourseModel } from "@/models/course";
import { Video as VideoModel } from "@/models/video";
import { Student } from "@/models/student";
import { CourseProgress } from "@/models/course-progress";
import VideoPlayer from "@/components/video/video-player";
import type mongoose from "mongoose";
import { authOptions } from "@/lib/auth";

// --- Types ---
interface TeacherType {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  email?: string;
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
};

type VideoAndCourseData = {
  currentVideo: VideoType;
  course: CourseType;
  videos: VideoType[];
};

// --- Data Fetching Helpers ---
async function getVideoAndCourse(
  videoId: string,
  courseId: string
): Promise<VideoAndCourseData | null> {
  await dbConnect();

  try {
    const video = await VideoModel.findById(videoId).lean();
    if (!video || video.course.toString() !== courseId) {
      return null;
    }

    const course = await CourseModel.findById(courseId)
      .populate<{ teacher: TeacherType }>("teacher", "name")
      .lean();
    if (!course) {
      return null;
    }

    const videos = await VideoModel.find({ course: courseId })
      .sort({ position: 1 })
      .lean();

    return {
      currentVideo: {
        ...video,
        _id: video._id.toString(),
        course: video.course.toString(),
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
        },
        imageUrl: course.imageUrl || "",
        syllabus: course.syllabus || "",
        isPublished: course.isPublished,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      },
      videos: videos.map(
        (v: VideoType): VideoType => ({
          ...v,
          _id: v._id.toString(),
          course: v.course.toString(),
          isCurrent: v._id.toString() === videoId,
        })
      ),
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
// Fix: Accept params directly as argument (Next.js App Router convention)
export default async function LearnPage(
  { params }: { params: { courseId: string; videoId: string } }
) {
  const { courseId, videoId } = params;
  const session = await getServerSession(authOptions);

  if (!session.user.id) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="mb-6">You need to be signed in to access this course.</p>
        <Link href="/student/signin">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  const isEnrolled = await checkEnrollmentStatus(courseId, session.user.id);

  if (!isEnrolled) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Enrollment Required</h1>
        <p className="mb-6">
          You need to enroll in this course to access the content.
        </p>
        <Link href={`/courses/${courseId}`}>
          <Button>View Course Details</Button>
        </Link>
      </div>
    );
  }

  const data = await getVideoAndCourse(videoId, courseId);

  if (!data) {
    notFound();
  }

  const { currentVideo, videos } = data;

  await updateProgress(session.user.id, courseId, videoId);

  const currentIndex = videos.findIndex((v) => v._id === videoId);
  const prevVideo = currentIndex > 0 ? videos[currentIndex - 1] : null;
  const nextVideo =
    currentIndex < videos.length - 1 ? videos[currentIndex + 1] : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/courses/${courseId}`}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          ← Back to course
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
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
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                Video not available
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold mb-2">{currentVideo.title}</h1>
            {currentVideo.description && (
              <p className="text-muted-foreground">
                {currentVideo.description}
              </p>
            )}
          </div>

          <div className="flex justify-between pt-4">
            {prevVideo ? (
              <Link href={`/courses/${courseId}/learn/${prevVideo._id}`}>
                <Button variant="outline">
                  <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
              </Link>
            ) : (
              <div />
            )}

            {nextVideo && (
              <Link href={`/courses/${courseId}/learn/${nextVideo._id}`}>
                <Button>
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted p-4">
              <h2 className="font-semibold">Course Content</h2>
              <p className="text-sm text-muted-foreground">
                {videos.length} videos
              </p>
            </div>

            <div className="divide-y max-h-[500px] overflow-y-auto">
              {videos.map((video) => (
                <Link
                  key={video._id}
                  href={`/courses/${courseId}/learn/${video._id}`}
                  className={`block ${
                    video.isCurrent ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <Card className="rounded-none border-0">
                    <CardContent className="p-4 flex items-center">
                      {video.isCurrent ? (
                        <PlayCircle className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                      ) : (
                        <CheckCircle className="h-5 w-5 mr-3 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="overflow-hidden">
                        <h4 className="font-medium truncate">{video.title}</h4>
                        {video.duration && (
                          <p className="text-xs text-muted-foreground">
                            {video.duration}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}