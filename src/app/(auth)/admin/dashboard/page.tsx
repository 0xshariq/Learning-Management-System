import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/dbConnect";
import { Student } from "@/models/student";
import { Teacher } from "@/models/teacher";
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
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Users,
  BookOpen,
  DollarSign,
  UserCheck,
  BarChart3,
  GraduationCap,
  Star,
  TrendingUp,
} from "lucide-react";
import { authOptions } from "@/lib/auth";

type RecentCourse = {
  _id: string;
  name: string;
  teacher?: { name?: string };
  createdAt: string | Date;
  isPublished: boolean;
  price: number;
};

type RecentUser = {
  _id: string;
  name: string;
  email: string;
  createdAt: string | Date;
  purchasedCourses?: string[];
};
interface ReviewType {
  _id: string;
  rating: number;
  [key: string]: string | number | undefined;
}
interface CourseWithStudents extends RecentCourse {
  studentsPurchased?: string[];
}
export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "admin") {
    redirect("/role");
  }

  await dbConnect();

  // Fetch platform statistics
  const studentCount = await Student.countDocuments();
  const teacherCount = await Teacher.countDocuments();
  const courseCount = await Course.countDocuments();
  const publishedCourseCount = await Course.countDocuments({
    isPublished: true,
  });

  // Get total revenue (placeholder calculation)
  const courses = await Course.find().lean();

  const totalRevenue = (courses as CourseWithStudents[]).reduce(
    (sum: number, course: CourseWithStudents) => {
      const studentCount: number = course.studentsPurchased?.length || 0;
      return sum + course.price * studentCount;
    },
    0
  );

  // Get reviews stats
  const reviews = await Review.find().lean();

  const averageRating: number =
    (reviews as ReviewType[]).length > 0
      ? (reviews as ReviewType[]).reduce(
          (sum: number, review: ReviewType) => sum + review.rating,
          0
        ) / (reviews as ReviewType[]).length
      : 0;

  // Get recent courses
  const recentCourses: RecentCourse[] = await Course.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("teacher", "name")
    .lean();

  // Get recent users (both students and teachers)
  const recentStudents: RecentUser[] = await Student.find()
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();
  const recentTeachers: RecentUser[] = await Teacher.find()
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  // Combine and sort by creation date
  const recentUsers: RecentUser[] = [...recentStudents, ...recentTeachers]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor platform performance and manage the learning ecosystem
        </p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="mr-2 h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{studentCount}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active learners on platform
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Teachers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <GraduationCap className="mr-2 h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">{teacherCount}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Content creators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BookOpen className="mr-2 h-4 w-4 text-purple-600" />
              <span className="text-2xl font-bold">{courseCount}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {publishedCourseCount} published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Platform Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="mr-2 h-4 w-4 text-orange-600" />
              <span className="text-2xl font-bold">
                ₹{totalRevenue.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total generated
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Course Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <TrendingUp className="mr-2 h-4 w-4 text-cyan-600" />
              <span className="text-2xl font-bold">
                {publishedCourseCount > 0
                  ? ((publishedCourseCount / courseCount) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Published vs total courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Star className="mr-2 h-4 w-4 text-yellow-600" />
              <span className="text-2xl font-bold">
                {averageRating.toFixed(1)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From {reviews.length} reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              User Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <UserCheck className="mr-2 h-4 w-4 text-indigo-600" />
              <span className="text-2xl font-bold">
                {studentCount > 0
                  ? ((reviews.length / studentCount) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Students who reviewed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Link href="/admin/users">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-medium">Manage Users</h3>
              <p className="text-sm text-muted-foreground">
                Students & Teachers
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/courses">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-medium">Manage Courses</h3>
              <p className="text-sm text-muted-foreground">Course oversight</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/analytics">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-medium">Analytics</h3>
              <p className="text-sm text-muted-foreground">Platform insights</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/settings">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-medium">Settings</h3>
              <p className="text-sm text-muted-foreground">Platform config</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Platform Overview Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Platform Overview
            </CardTitle>
            <CardDescription>
              Monthly statistics and growth trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-md">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Analytics dashboard coming soon
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Interactive charts and detailed insights will be displayed
                  here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Courses */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Courses</CardTitle>
            <CardDescription>
              Newly created courses on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCourses.map((course) => (
                <div
                  key={course._id.toString()}
                  className="flex justify-between items-center border-b pb-3 last:border-b-0"
                >
                  <div className="flex-1">
                    <div className="font-medium line-clamp-1">
                      {course.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      By {course.teacher?.name || "Unknown"} •{" "}
                      {new Date(course.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={course.isPublished ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {course.isPublished ? "Published" : "Draft"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {course.price === 0 ? "Free" : `₹${course.price}`}
                      </span>
                    </div>
                  </div>
                  <Link href={`/courses/${course._id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-4 text-center">
              <Link href="/admin/courses">
                <Button variant="outline">View All Courses</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>
              Newly registered users on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div
                  key={user._id.toString()}
                  className="flex justify-between items-center border-b pb-3 last:border-b-0"
                >
                  <div className="flex-1">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {user.email}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {"purchasedCourses" in user ? "Student" : "Teacher"}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="mt-4 text-center">
              <Link href="/admin/users">
                <Button variant="outline">Manage Users</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
