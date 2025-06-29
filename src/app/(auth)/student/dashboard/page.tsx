import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/dbConnect";
import { Student } from "@/models/student";
import { Course } from "@/models/course";
import { Review } from "@/models/review";
import { RequestRefund } from "@/models/request-refund";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  FileText,
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
  price?: number;
}

interface RefundRequestType {
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

  // Fetch student's refund requests
  const refundRequests: RefundRequestType[] = await RequestRefund.find({
    studentId: student._id,
  })
    .populate("courseId", "name price")
    .populate("studentId", "name email")
    .populate("processedBy", "name email")
    .sort({ createdAt: -1 })
    .lean();

  // Calculate stats
  const totalCourses = enrolledCourses.length;
  const completedCourses = 0; // Placeholder - would need progress tracking
  const totalReviews = reviews.length;
  const pendingRefunds = refundRequests.filter(req => req.requestStatus === "pending").length;
  const acceptedRefunds = refundRequests.filter(req => req.requestStatus === "accepted").length;

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Refund Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <RefreshCw className="mr-2 h-4 w-4 text-orange-600" />
              <span className="text-2xl font-bold">{refundRequests.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingRefunds} pending • {acceptedRefunds} approved
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

      {/* Refund Requests Section */}
      {refundRequests.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Refund Requests</h2>
            {pendingRefunds > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                {pendingRefunds} Pending Review
              </Badge>
            )}
          </div>

          <div className="grid gap-4">
            {refundRequests.slice(0, 3).map((request) => {
              const getStatusBadge = (status: string) => {
                switch (status) {
                  case "pending":
                    return (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending Review
                      </Badge>
                    );
                  case "accepted":
                    return (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    );
                  case "rejected":
                    return (
                      <Badge variant="destructive" className="bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                      </Badge>
                    );
                  default:
                    return <Badge variant="outline">{status}</Badge>;
                }
              };

              const getCategoryLabel = (category: string) => {
                switch (category) {
                  case "duplicate":
                    return "Duplicate Payment";
                  case "not_as_described":
                    return "Not as Described";
                  case "other":
                    return "Other";
                  default:
                    return category;
                }
              };

              return (
                <Card key={request._id} className={`${
                  request.requestStatus === "accepted" ? "border-l-4 border-l-green-500" :
                  request.requestStatus === "rejected" ? "border-l-4 border-l-red-500" :
                  "border-l-4 border-l-yellow-500"
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{request.courseId.name}</CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ₹{request.amount}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(request.requestedAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {getCategoryLabel(request.refundReasonCategory)}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(request.requestStatus)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {request.reason && (
                      <div>
                        <h4 className="font-medium mb-1 text-sm">Reason:</h4>
                        <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                          {request.reason}
                        </p>
                      </div>
                    )}

                    {request.processedBy && (
                      <div className="text-xs text-muted-foreground">
                        Processed by: {request.processedBy.name}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {request.requestStatus === "pending" && (
                        <div className="flex items-center gap-2 text-yellow-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Awaiting instructor review...</span>
                        </div>
                      )}
                      
                      {request.requestStatus === "accepted" && (
                        <Link href={`/refund?courseId=${request.courseId._id}&courseName=${encodeURIComponent(request.courseId.name)}&price=${request.courseId.price}&studentId=${student._id}`} className="flex-1">
                          <Button className="w-full bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Proceed with Refund
                          </Button>
                        </Link>
                      )}
                      
                      {request.requestStatus === "rejected" && (
                        <div className="flex items-center gap-2 text-red-600">
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Request was rejected by instructor</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {refundRequests.length > 3 && (
            <div className="text-center mt-4">
              <Button variant="outline">View All Refund Requests</Button>
            </div>
          )}
        </div>
      )}

      {/* My Courses Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">My Courses</h2>
          <Link href="/courses">
            <Button variant="outline">Browse More Courses</Button>
          </Link>
        </div>

        {enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((course: EnrolledCourseType) => {
              // Calculate progress (placeholder - would need actual progress tracking)
              const progress = Math.floor(Math.random() * 100);

              // Check if there's a refund request for this course
              const courseRefundRequest = refundRequests.find(
                req => req.courseId._id.toString() === course._id.toString()
              );

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
                    {courseRefundRequest && (
                      <div className="absolute top-2 left-2">
                        {courseRefundRequest.requestStatus === "pending" && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                            Refund Pending
                          </Badge>
                        )}
                        {courseRefundRequest.requestStatus === "accepted" && (
                          <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                            Refund Approved
                          </Badge>
                        )}
                        {courseRefundRequest.requestStatus === "rejected" && (
                          <Badge variant="destructive" className="bg-red-100 text-red-800 text-xs">
                            Refund Rejected
                          </Badge>
                        )}
                      </div>
                    )}
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
                      {!courseRefundRequest && course.price && course.price > 0 && (
                        <Link href={`/request-refund?courseId=${course._id}&courseName=${encodeURIComponent(course.name)}&price=${course.price}&studentId=${student._id}`}>
                          <Button variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
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
              <Link href="/courses">
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