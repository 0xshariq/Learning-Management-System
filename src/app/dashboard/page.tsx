import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/dbConnect";
import { Student } from "@/models/student";
import { Course } from "@/models/course";
import { CourseProgress } from "@/models/course-progress";
import { Certificate } from "@/models/certificate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, Award, Clock } from "lucide-react";

export default async function StudentDashboard() {
  const session = await getServerSession();

  if (!session || !session.user) {
    redirect("/student/signin");
  }

  await dbConnect();

  // Fetch student data
  const student = await Student.findOne({ email: session.user.email }).lean();

  if (!student) {
    redirect("/student/signin");
  }

  // Fetch enrolled courses
  const enrolledCourses = await Course.find({
    _id: { $in: student.purchasedCourses || [] },
  })
    .populate("teacher", "name")
    .lean();

  // Fetch course progress
  const progress = await CourseProgress.find({
    student: student._id,
  }).lean();

  // Fetch certificates
  const certificates = await Certificate.find({
    student: student._id,
  })
    .populate("course", "name")
    .lean();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Student Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enrolled Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BookOpen className="mr-2 h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">
                {enrolledCourses.length}
              </span>
            </div>
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
              <Award className="mr-2 h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">
                {progress.filter((p) => p.percentageCompleted === 100).length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Certificates Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Award className="mr-2 h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{certificates.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hours Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">
                {/* Placeholder for hours spent */}
                {Math.floor(Math.random() * 100)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-bold mb-4">My Courses</h2>

      {enrolledCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrolledCourses.map((course) => {
            const courseProgress = progress.find(
              (p) => p.course.toString() === course._id.toString()
            );
            const percentComplete = courseProgress
              ? courseProgress.percentageCompleted
              : 0;

            return (
              <Card key={course._id.toString()} className="overflow-hidden">
                <div className="aspect-video relative bg-muted">
                  {course.imageUrl ? (
                    <img
                      src={course.imageUrl || "/placeholder.svg"}
                      alt={course.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-muted">
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <CardHeader>
                  <CardTitle>{course.name}</CardTitle>
                  <CardDescription>
                    By {course.teacher.name} • {course.duration}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="mb-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm font-medium">
                        {percentComplete}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2"
                        style={{ width: `${percentComplete}%` }}
                      />
                    </div>
                  </div>

                  <Link href={`/courses/${course._id}`}>
                    <Button className="w-full">
                      {percentComplete > 0
                        ? "Continue Learning"
                        : "Start Course"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">No courses enrolled yet</h3>
          <p className="text-muted-foreground mb-4">
            Browse our catalog and enroll in your first course
          </p>
          <Link href="/courses/all">
            <Button>Browse Courses</Button>
          </Link>
        </div>
      )}

      {certificates.length > 0 && (
        <>
          <h2 className="text-2xl font-bold mt-12 mb-4">My Certificates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((certificate) => (
              <Card key={certificate._id.toString()}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="mr-2 h-5 w-5 text-primary" />
                    {certificate.course.name}
                  </CardTitle>
                  <CardDescription>
                    Issued on{" "}
                    {new Date(certificate.issueDate).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={certificate.certificateUrl} target="_blank">
                    <Button variant="outline" className="w-full">
                      View Certificate
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
