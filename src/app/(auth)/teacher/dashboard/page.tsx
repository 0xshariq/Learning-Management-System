import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/dbConnect";
import { Teacher } from "@/models/teacher";
import { Course } from "@/models/course";
import { Student } from "@/models/student";
import { Review } from "@/models/review";
import { RequestRefund } from "@/models/request-refund";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, DollarSign, Users, Star, Plus, Eye, EyeOff, TrendingUp, BarChart3, RefreshCw } from "lucide-react";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import React from "react";
import { SaleTimer, SalePriceBlock } from "@/components/courses/course-sales";
import RefundRequestsSection from "@/components/teacher/refund-requests-section";

// Sale interface (separate)
interface SaleData {
  _id: string;
  amount: number;
  saleTime: string;
  expiryTime?: string;
  notes?: string;
}

interface ITeacher {
  _id: string;
  name: string;
  email: string;
  password: string;
  upiId: string;
  age?: number;
  coursesCreated: string[];
  totalEarnings: number;
  ratings: string[];
  averageRating: number;
  isBlocked: boolean;
  loginAttempts: number;
  lockUntil: Date | null;
  lastLogin: Date | null;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  bio: string;
  phone: string;
  website: string;
  profileImage: string;
  createdAt: Date;
  updatedAt: Date;
  isLocked?: boolean;
}

interface ICourse {
  _id: string;
  name: string;
  imageUrl?: string;
  duration?: string;
  studentsPurchased?: string[];
  price: number;
  isPublished: boolean;
}

interface IReview {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string | Date;
  student?: {
    _id: string;
    name: string;
  };
  course?: {
    _id: string;
    name: string;
  };
}

interface IRefundRequest {
  _id: string;
  courseId: {
    _id: string;
    name: string;
    price: number;
  };
  studentId: {
    _id: string;
    name: string;
    email: string;
  };
  amount: number;
  reason?: string;
  notes?: string;
  refundReasonCategory: "duplicate" | "not_as_described" | "other";
  requestStatus: "pending" | "accepted" | "rejected";
  processedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  attachments?: string[];
  requestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "teacher") {
    redirect("/role");
  }

  await dbConnect();

  // Fetch teacher data
  const teacher: ITeacher | null = await Teacher.findById(session.user.id).lean();

  if (!teacher) {
    redirect("/role");
  }

  // Fix: Ensure type match for teacher._id and course.teacher
  const teacherId =
    typeof teacher._id === "string"
      ? new mongoose.Types.ObjectId(teacher._id)
      : teacher._id;

  // Fetch courses created by the teacher (handle both ObjectId and string)
  const courses: ICourse[] = await Course.find({
    $or: [{ teacher: teacherId }, { teacher: teacherId.toString() }],
  }).lean();

  const courseIds: string[] = courses.map((course) =>
    typeof course._id === "string"
      ? course._id
      : (course._id as mongoose.Types.ObjectId).toString()
  );

  // Count total students across all courses
  const totalStudents = await Student.countDocuments({
    purchasedCourses: { $in: courseIds },
  });

  // Fetch reviews for teacher's courses
  const reviews: IReview[] = await Review.find({
    course: { $in: courseIds },
  })
    .populate("student", "name")
    .populate("course", "name")
    .lean();

  // Fetch refund requests for teacher's courses
  const refundRequests: IRefundRequest[] = await RequestRefund.find({
    courseId: { $in: courseIds },
  })
    .populate("courseId", "name price")
    .populate("studentId", "name email")
    .populate("processedBy", "name email")
    .sort({ createdAt: -1 })
    .lean();

  // Calculate average rating
  const averageRating: number =
    reviews.length > 0
      ? reviews.reduce((sum: number, review: IReview) => sum + review.rating, 0) / reviews.length
      : 0;

  // Calculate total revenue (placeholder - would need payment system)
  const totalRevenue = courses.reduce((sum, course) => {
    const studentCount = course.studentsPurchased?.length || 0;
    return sum + course.price * studentCount;
  }, 0);

  // Get published courses count
  const publishedCourses = courses.filter((course) => course.isPublished).length;

  // Get pending refund requests count
  const pendingRefunds = refundRequests.filter((req) => req.requestStatus === "pending").length;

  // Fetch all active sales for teacher's courses using API route
  async function fetchSaleForCourse(courseId: string): Promise<SaleData | null> {
    try {
      const baseUrl =
        process.env.NEXTAUTH_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");
      const res = await fetch(
        `${baseUrl}/api/courses/${courseId}/sales`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;
      const saleData: { sales?: SaleData[] } = await res.json();
      const now = new Date();
      const activeSale = saleData.sales?.find(
        (sale) =>
          new Date(sale.saleTime) <= now &&
          (!sale.expiryTime || new Date(sale.expiryTime) >= now)
      );
      return activeSale || null;
    } catch {
      return null;
    }
  }

  // Fetch all sales for dashboard courses
  const sales: Record<string, SaleData | null> = {};
  await Promise.all(
    courses.map(async (course) => {
      sales[course._id.toString()] = await fetchSaleForCourse(course._id.toString());
    })
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back, {teacher.name}!</h1>
          <p className="text-muted-foreground">Manage your courses and track your teaching performance</p>
          <div className="mt-2 flex flex-wrap gap-4 items-center">
            <span className="text-sm text-muted-foreground">Email: {teacher.email}</span>
            <span className="text-sm text-muted-foreground">UPI ID: {teacher.upiId}</span>
            {teacher.age && <span className="text-sm text-muted-foreground">Age: {teacher.age}</span>}
            {teacher.phone && <span className="text-sm text-muted-foreground">Phone: {teacher.phone}</span>}
            {teacher.website && (
              <a
                href={teacher.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 underline"
              >
                Website
              </a>
            )}
            {teacher.bio && <span className="text-sm text-muted-foreground">Bio: {teacher.bio}</span>}
          </div>
        </div>
        <Link href="/teacher/courses/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create New Course
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BookOpen className="mr-2 h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{courses.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{publishedCourses} published</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="mr-2 h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">{totalStudents}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all courses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="mr-2 h-4 w-4 text-purple-600" />
              <span className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Star className="mr-2 h-4 w-4 text-yellow-600" />
              <span className="text-2xl font-bold">{averageRating.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">From {reviews.length} reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <RefreshCw className="mr-2 h-4 w-4 text-orange-600" />
              <span className="text-2xl font-bold">{pendingRefunds}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Link href="/teacher/courses/create">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Plus className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-medium">Create Course</h3>
              <p className="text-sm text-muted-foreground">Start a new course</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/teacher/courses">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-medium">My Courses</h3>
              <p className="text-sm text-muted-foreground">Manage existing courses</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/teacher/reviews">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-medium">Reviews</h3>
              <p className="text-sm text-muted-foreground">View all your reviews</p>
            </CardContent>
          </Card>
        </Link>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-medium">Insights</h3>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Refund Requests Section */}
      {refundRequests.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Refund Requests</h2>
            {pendingRefunds > 0 && (
              <Badge variant="destructive" className="text-sm">
                {pendingRefunds} Pending
              </Badge>
            )}
          </div>

          <RefundRequestsSection initialRequests={refundRequests} />
        </div>
      )}

      {/* My Courses Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">My Courses</h2>
          <Link href="/teacher/courses">
            <Button variant="outline">View All Courses</Button>
          </Link>
        </div>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.slice(0, 6).map((course: ICourse) => {
              // Count students for this course
              const courseStudents = course.studentsPurchased?.length || 0;

              // Get course reviews
              const courseReviews = reviews.filter(
                (review: IReview) => review.course?._id?.toString() === course._id.toString()
              );

              // Calculate course rating
              const courseRating =
                courseReviews.length > 0
                  ? courseReviews.reduce((sum: number, review: IReview) => sum + review.rating, 0) / courseReviews.length
                  : 0;

              // Sale logic
              const sale = sales[course._id.toString()];
              return (
                <Card key={course._id.toString()} className="overflow-hidden hover:shadow-md transition-shadow relative">
                  <div className="aspect-video relative bg-muted">
                    <Image
                      src={
                        course.imageUrl ||
                        `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(course.name) || "/placeholder.svg"}`
                      }
                      alt={course.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-2 items-end">
                      <Badge variant={course.isPublished ? "default" : "secondary"}>
                        {course.isPublished ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Published
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Draft
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="pb-3">
                    <CardTitle className="line-clamp-1">{course.name}</CardTitle>
                    <CardDescription>
                      {course.duration || "Self-paced"} • {courseStudents} students enrolled
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{courseRating.toFixed(1)}</span>
                        <span className="text-muted-foreground text-sm">({courseReviews.length})</span>
                      </div>
                      <div className="font-medium">
                        {sale ? (
                          <>
                            <SalePriceBlock sale={sale} price={course.price} />
                            <SaleTimer expiryTime={sale.expiryTime} />
                          </>
                        ) : (
                          course.price === 0 ? "Free" : `₹${course.price}`
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/courses/${course._id}`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          Manage
                        </Button>
                      </Link>
                      <Link href={`/courses/${course._id}`} className="flex-1">
                        <Button className="w-full" size="sm">
                          View
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
              <h3 className="text-xl font-medium mb-2">No courses created yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first course to start teaching and sharing your knowledge
              </p>
              <Link href="/teacher/courses/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Course
                </Button>
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
            {reviews.slice(0, 4).map((review: IReview) => (
              <Card key={review._id.toString()}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium line-clamp-1">{review.course?.name || "Unknown Course"}</h4>
                      <p className="text-sm text-muted-foreground">by {review.student?.name || "Anonymous"}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${star <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{review.comment}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          {reviews.length > 4 && (
            <div className="text-center mt-4">
              <Link href="/teacher/reviews">
                <Button variant="outline">View All Reviews</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}