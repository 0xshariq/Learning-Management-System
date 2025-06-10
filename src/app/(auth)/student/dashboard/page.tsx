import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/dbConnect";
import { Student } from "@/models/student";
import { Course } from "@/models/course";
import { Review } from "@/models/review";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Award,
  Clock,
  Star,
  PlayCircle,
  User,
  TrendingUp,
} from "lucide-react";
import { authOptions } from "@/lib/auth";

interface ReviewType {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string | Date;
  course?: {
    name?: string;
  };
}

interface TeacherType {
  name?: string;
}

interface EnrolledCourseType {
  _id: string;
  name: string;
  imageUrl?: string;
  teacher?: TeacherType;
  duration?: string;
}

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "student") {
    redirect("/role");
  }

  await dbConnect();

  // Fetch student data
  const student = await Student.findById(session.user.id).lean();

  if (!student) {
    redirect("/role");
  }

  // Fetch enrolled courses with teacher info
  const enrolledCourses: EnrolledCourseType[] = await Course.find({
    _id: { $in: student.purchasedCourses || [] },
  })
    .populate("teacher", "name")
    .lean();

  // Fetch student's reviews
  const reviews: ReviewType[] = await Review.find({ student: student._id })
    .populate("course", "name")
    .lean();

  // Calculate stats
  const totalCourses = enrolledCourses.length;
  const completedCourses = 0; // Placeholder - would need progress tracking
  const totalReviews = reviews.length;

  const averageRating: number =
    reviews.length > 0
      ? reviews.reduce(
          (sum: number, review: ReviewType) =>
            sum + (typeof review.rating === "number" ? review.rating : 0),
          0
        ) / reviews.length
      : 0;

  // Calculate estimated hours (placeholder calculation)
  const estimatedHours = totalCourses * 10; // Assuming 10 hours per course

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {student.name}!
        </h1>
        <p className="text-muted-foreground">Continue your learning journey</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enrolled Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BookOpen className="mr-2 h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{totalCourses}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCourses > 0 ? "Keep learning!" : "Start your first course"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Award className="mr-2 h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">{completedCourses}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCourses > 0
                ? `${
                    totalCourses === 0
                      ? 0
                      : ((completedCourses / totalCourses) * 100).toFixed(0)
                  }% completion rate`
                : "No courses completed"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reviews Written
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Star className="mr-2 h-4 w-4 text-yellow-600" />
              <span className="text-2xl font-bold">{totalReviews}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg rating: {averageRating > 0 ? averageRating.toFixed(1) : "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Learning Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4 text-purple-600" />
              <span className="text-2xl font-bold">{estimatedHours}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated total hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Link href="/courses/all">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-medium">Browse Courses</h3>
              <p className="text-sm text-muted-foreground">
                Discover new learning opportunities
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/student/profile">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <User className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-medium">My Profile</h3>
              <p className="text-sm text-muted-foreground">
                Manage your account settings
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-medium">Progress Tracking</h3>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* My Courses Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">My Courses</h2>
          <Link href="/courses/all">
            <Button variant="outline">Browse More Courses</Button>
          </Link>
        </div>

        {enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((course: EnrolledCourseType) => {
              // Calculate progress (placeholder - would need actual progress tracking)
              const progress = Math.floor(Math.random() * 100);

              return (
                <Card
                  key={course._id}
                  className="overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-video relative bg-muted">
                    <Image
                      src={
                        course.imageUrl ||
                        `/placeholder.svg?height=200&width=400&text=${
                          encodeURIComponent(course.name) || "/placeholder.svg"
                        }`
                      }
                      alt={course.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-background/90 px-2 py-1 rounded text-xs font-medium">
                      {progress}% Complete
                    </div>
                  </div>

                  <CardHeader className="pb-3">
                    <CardTitle className="line-clamp-1">
                      {course.name}
                    </CardTitle>
                    <CardDescription>
                      By {course.teacher?.name || "Unknown"} •{" "}
                      {course.duration || "Self-paced"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="mb-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/courses/${course._id}`} className="flex-1">
                        <Button className="w-full">
                          <PlayCircle className="h-4 w-4 mr-2" />
                          {progress > 0 ? "Continue" : "Start"}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-medium mb-2">
                No courses enrolled yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Start your learning journey by enrolling in your first course
              </p>
              <Link href="/courses/all">
                <Button>Browse Courses</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Reviews */}
      {reviews.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Recent Reviews</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {reviews.slice(0, 4).map((review: ReviewType) => (
              <Card key={review._id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium line-clamp-1">
                      {review.course?.name || "Unknown Course"}
                    </h4>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= review.rating
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {review.comment}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          {reviews.length > 4 && (
            <div className="text-center mt-4">
              <Link href="/student/profile">
                <Button variant="outline">View All Reviews</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}