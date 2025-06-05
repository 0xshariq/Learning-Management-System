import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Eye, EyeOff, Trash2, Video } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import { Course } from "@/models/course";
import { Video as VideoModel } from "@/models/video";
import { authOptions } from "@/lib/auth";

// Add proper type definitions
interface TeacherCourse {
  _id: string;
  name: string;
  description: string;
  syllabus?: string;
  price: number;
  duration: string;
  imageUrl?: string;
  isPublished: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  videoCount: number;
  teacher: string;
  studentsPurchased?: string[];
}
interface CourseLean extends Omit<TeacherCourse, "videoCount" | "_id"> {
  _id: string | any;
}
// Update the getTeacherCourses function return type
async function getTeacherCourses(teacherId: string): Promise<TeacherCourse[]> {
  await dbConnect();

  try {
    const courses = await Course.find({ teacher: teacherId })
      .sort({ createdAt: -1 })
      .lean<TeacherCourse[]>();

    // Get video counts for each course

    const coursesWithVideos: TeacherCourse[] = await Promise.all(
      courses.map(async (course: CourseLean): Promise<TeacherCourse> => {
        const videoCount: number = await VideoModel.countDocuments({
          course: course._id,
        });
        return {
          ...course,
          _id: course._id.toString(),
          videoCount,
        };
      })
    );

    return coursesWithVideos;
  } catch (error) {
    console.error("Error fetching teacher courses:", error);
    return [];
  }
}

export default async function TeacherCoursesPage() {
  const session = await getServerSession(authOptions);

  console.log("Teacher Courses : ", session?.user);
  if (!session || !session.user || session.user.role !== "teacher") {
    redirect("/teacher/signin");
  }
  const courses = await getTeacherCourses(session.user.id);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Courses</h1>
          <p className="text-muted-foreground mt-2">
            Manage your courses and content
          </p>
        </div>
        <Link href="/teacher/courses/create">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Course
          </Button>
        </Link>
      </div>

      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card
              key={course._id}
              className="flex flex-col h-full overflow-hidden"
            >
              <div className="aspect-video relative bg-muted">
                <Image
                  src={
                    course.imageUrl ||
                    `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(
                      course.name
                    )}`
                  }
                  alt={course.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge variant={course.isPublished ? "default" : "outline"}>
                    {course.isPublished ? "Published" : "Draft"}
                  </Badge>
                </div>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-xl line-clamp-2">
                  {course.name}
                </CardTitle>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    <Video className="mr-1 h-3 w-3" /> {course.videoCount}{" "}
                    videos
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-grow">
                <p className="text-muted-foreground line-clamp-3">
                  {course.description}
                </p>
                <div className="mt-4">
                  <p className="font-medium">Price: ₹{course.price}</p>
                  <p className="text-sm text-muted-foreground">
                    Duration: {course.duration}
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
                <Link href={`/teacher/courses/${course._id}`}>
                  <Button variant="outline" size="sm">
                    <Edit className="mr-1 h-4 w-4" /> Edit
                  </Button>
                </Link>
                <Link href={`/courses/${course._id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="mr-1 h-4 w-4" /> Preview
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className={
                    course.isPublished ? "text-amber-500" : "text-green-500"
                  }
                >
                  {course.isPublished ? (
                    <>
                      <EyeOff className="mr-1 h-4 w-4" /> Unpublish
                    </>
                  ) : (
                    <>
                      <Eye className="mr-1 h-4 w-4" /> Publish
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg">
          <h2 className="text-xl font-medium mb-2">
            You haven&apos;t created any courses yet
          </h2>
          <p className="text-muted-foreground mb-6">
            Start creating your first course and share your knowledge with
            students.
          </p>
          <Link href="/teacher/courses/create">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Course
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
