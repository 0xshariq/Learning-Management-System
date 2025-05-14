import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/dbConnect";
import { Admin } from "@/models/admin";
import { Student } from "@/models/student";
import { Teacher } from "@/models/teacher";
import { Course } from "@/models/course";
import { Payment } from "@/models/payment";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  BookOpen,
  DollarSign,
  UserCheck,
  BarChart3,
} from "lucide-react";

export default async function AdminDashboard() {
  const session = await getServerSession();

  if (!session || !session.user) {
    redirect("/admin/signin");
  }

  await dbConnect();

  // Fix for ESM/CJS interop if Admin is imported as a module object
  const adminModel = Admin.findOne ? Admin : (Admin as any).default;
  const admin = await adminModel.findOne({ email: session.user.email }).lean();

  if (!admin) {
    redirect("/admin/signin");
  }

  // Fetch platform statistics
  const studentCount = await Student.countDocuments();
  const teacherCount = await Teacher.countDocuments();
  const courseCount = await Course.countDocuments();

  // Get total revenue
  const payments = await Payment.find({ status: "completed" }).lean();
  const totalRevenue = payments.reduce(
    (sum: number, payment: any) => sum + (payment.amount || 0),
    0
  );

  // Get recent courses
  const recentCourses = await Course.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("teacher", "name")
    .lean();

  // Get recent users (both students and teachers)
  const recentStudents = await Student.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
  const recentTeachers = await Teacher.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // Combine and sort by creation date
  const recentUsers = [...recentStudents, ...recentTeachers]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="mr-2 h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{studentCount}</span>
            </div>
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
              <UserCheck className="mr-2 h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{teacherCount}</span>
            </div>
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
              <BookOpen className="mr-2 h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{courseCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="mr-2 h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">
                ₹{totalRevenue.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Platform Overview
            </CardTitle>
            <CardDescription>
              Monthly statistics for the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-md">
              <p className="text-muted-foreground">
                Chart placeholder - Analytics data will be displayed here
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Courses</CardTitle>
            <CardDescription>
              Newly created courses on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCourses.map((course: any) => (
                <div
                  key={course._id.toString()}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <div>
                    <div className="font-medium">{course.name}</div>
                    <div className="text-sm text-muted-foreground">
                      By {course.teacher?.name ?? "Unknown"} •{" "}
                      {new Date(course.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <Link href={`/courses/${course._id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
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

        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>
              Newly registered users on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user: any) => (
                <div
                  key={user._id.toString()}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.email} •{" "}
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                      {"purchasedCourses" in user ? "Student" : "Teacher"}
                    </span>
                  </div>
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

      <div className="grid grid-cols-1 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/admin/courses" passHref legacyBehavior>
                <Button as="a" variant="outline" className="w-full">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Manage Courses
                </Button>
              </Link>
              <Link href="/admin/users" passHref legacyBehavior>
                <Button as="a" variant="outline" className="w-full">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Users
                </Button>
              </Link>
              <Link href="/admin/payments" passHref legacyBehavior>
                <Button as="a" variant="outline" className="w-full">
                  <DollarSign className="mr-2 h-4 w-4" />
                  View Payments
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
