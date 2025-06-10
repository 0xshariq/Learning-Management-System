import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/dbConnect";
import { Teacher } from "@/models/teacher";
import { Course } from "@/models/course";
import { Student } from "@/models/student";
import { Review } from "@/models/review";
import { TeacherProfile } from "@/components/profile/teacher-profile";
import { authOptions } from "@/lib/auth";

interface CourseLean {
  _id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  isPublished: boolean;
  studentsPurchased?: string[];
  createdAt: Date;
}

interface ReviewLean {
  _id: string;
  rating: number;
  comment: string;
  student: { name?: string } | null;
  course: { name?: string } | null;
  createdAt: Date;
}

async function getTeacherData(teacherId: string) {
  await dbConnect();

  try {
    const teacher = await Teacher.findById(teacherId).lean();
    if (!teacher) return null;

    const courses = await Course.find({ teacher: teacherId }).lean();

    // Get total students across all courses
    const totalStudents = await Student.countDocuments({
      purchasedCourses: { $in: courses.map((c: CourseLean) => c._id) },
    });

    // Get recent reviews for teacher's courses
    const reviews = await Review.find({
      course: { $in: courses.map((c: CourseLean) => c._id) },
    })
      .populate("student", "name")
      .populate("course", "name")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Calculate average rating
    const avgRating: number =
      (reviews as ReviewLean[]).length > 0
        ? (reviews as ReviewLean[]).reduce(
            (sum: number, r: ReviewLean) => sum + r.rating,
            0
          ) / (reviews as ReviewLean[]).length
        : 0;

    // Calculate total revenue
    const totalRevenue = (courses as CourseLean[]).reduce(
      (sum: number, course: CourseLean) => {
        const studentCount = course.studentsPurchased?.length || 0;
        return sum + course.price * studentCount;
      },
      0
    );

    return {
      teacher: {
        _id: teacher._id.toString(),
        name: teacher.name,
        email: teacher.email,
        bio: teacher.bio || "",
        phone: teacher.phone || "",
        website: teacher.website || "",
        profileImage: teacher.profileImage || "",
        createdAt: teacher.createdAt,
      },
      courses: courses.map((course: CourseLean) => ({
        _id: course._id.toString(),
        name: course.name,
        description: course.description,
        imageUrl: course.imageUrl,
        price: course.price,
        isPublished: course.isPublished,
        studentCount: course.studentsPurchased?.length || 0,
        createdAt: course.createdAt,
      })),
      stats: {
        totalCourses: courses.length,
        totalStudents,
        totalRevenue,
        averageRating: avgRating,
        publishedCourses: courses.filter((c: CourseLean) => c.isPublished).length,
      },
      recentReviews: (reviews as ReviewLean[]).map((review) => ({
        _id: review._id.toString(),
        rating: review.rating,
        comment: review.comment,
        student: {
          name: review.student?.name || "Anonymous",
        },
        course: {
          name: review.course?.name || "Unknown Course",
        },
        createdAt: review.createdAt,
      })),
    };
  } catch (error) {
    console.error("Error fetching teacher data:", error);
    return null;
  }
}

export default async function TeacherProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "teacher") {
    redirect("/role");
  }

  const data = await getTeacherData(session.user.id);

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
          <p className="text-muted-foreground">
            Unable to load your profile data.
          </p>
        </div>
      </div>
    );
  }

  return <TeacherProfile data={data} />;
}