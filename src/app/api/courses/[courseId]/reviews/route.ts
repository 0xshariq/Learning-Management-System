import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { dbConnect } from "@/lib/dbConnect";
import { Review, reviewValidationSchema } from "@/models/review"; // Import validation schema from model
import { Student } from "@/models/student";
import { Course } from "@/models/course";
import { authOptions } from "@/lib/auth";

interface PopulatedStudent {
  _id: string | { toString: () => string };
  name: string;
}

interface PopulatedReview {
  _id: string | { toString: () => string };
  rating: number;
  comment: string;
  student: PopulatedStudent;
  course: string | { toString: () => string };
  createdAt: Date;
}

interface FormattedReview {
  _id: string;
  rating: number;
  comment: string;
  student: {
    _id: string;
    name: string;
  };
  course: string;
  createdAt: Date;
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Authentication required. Please sign in to leave a review." },
        { status: 401 }
      );
    }

    if (session.user.role !== "student") {
      return NextResponse.json(
        { message: "Only students can leave reviews for courses." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Use validation schema from model, but adapt for API input (courseId instead of course)
    const parseResult = reviewValidationSchema
      .pick({ rating: true, comment: true })
      .extend({ courseId: reviewValidationSchema.shape.course })
      .safeParse({ ...body, courseId: body.courseId });

    if (!parseResult.success) {
      return NextResponse.json(
        { message: parseResult.error.errors[0]?.message || "Invalid input." },
        { status: 400 }
      );
    }

    const { rating, comment, courseId } = parseResult.data;

    await dbConnect();

    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json(
        { message: "Course not found. Unable to submit review." },
        { status: 404 }
      );
    }

    const student = await Student.findById(session.user.id);
    if (!student || !student.purchasedCourses?.includes(courseId)) {
      return NextResponse.json(
        { message: "You must be enrolled in this course to leave a review. Please enroll first." },
        { status: 403 }
      );
    }

    const existingReview = await Review.findOne({
      student: session.user.id,
      course: courseId,
    });

    if (existingReview) {
      return NextResponse.json(
        { message: "You have already reviewed this course. You can only submit one review per course." },
        { status: 400 }
      );
    }

    const review = await Review.create({
      rating,
      comment: comment?.trim(),
      student: session.user.id,
      course: courseId,
    });

    const populatedReview = await Review.findById(review._id)
      .populate("student", "name")
      .lean();

    return NextResponse.json(
      {
        message: "Review submitted successfully! Thank you for your feedback.",
        review: {
          _id: populatedReview._id.toString(),
          rating: populatedReview.rating,
          comment: populatedReview.comment,
          student: {
            _id: populatedReview.student._id.toString(),
            name: populatedReview.student.name,
          },
          course: populatedReview.course.toString(),
          createdAt: populatedReview.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating review:", error);

    if (error instanceof Error) {
      if (error.message.includes("Cast to ObjectId failed")) {
        return NextResponse.json(
          { message: "Invalid course or user ID format. Please try again." },
          { status: 400 }
        );
      }
      if (error.message.includes("duplicate key")) {
        return NextResponse.json(
          { message: "You have already reviewed this course." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { message: "An unexpected error occurred while submitting your review. Please try again later." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const url = request.nextUrl;
    const segments = url.pathname.split("/").filter(Boolean);
    const courseIdx = segments.findIndex((seg) => seg === "courses");
    const courseId = courseIdx !== -1 && segments.length > courseIdx + 1 ? segments[courseIdx + 1] : null;

    if (!courseId || typeof courseId !== "string") {
      return NextResponse.json({ message: "Invalid course ID provided." }, { status: 400 });
    }

    // Always return all reviews for the course, newest first
    const reviews = await Review.find({ course: courseId })
      .populate("student", "name")
      .sort({ createdAt: -1 })
      .lean();

    const formattedReviews: FormattedReview[] = (reviews as PopulatedReview[]).map((review) => ({
      _id: typeof review._id === "string" ? review._id : review._id.toString(),
      rating: review.rating,
      comment: review.comment,
      student: {
        _id: typeof review.student._id === "string"
          ? review.student._id
          : review.student._id?.toString?.() || "",
        name: review.student.name,
      },
      course: typeof review.course === "string" ? review.course : review.course.toString(),
      createdAt: review.createdAt,
    }));

    return NextResponse.json(
      {
        reviews: formattedReviews,
        total: formattedReviews.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching reviews:", error);

    if (error instanceof Error && error.message.includes("Cast to ObjectId failed")) {
      return NextResponse.json(
        { message: "Invalid course ID format." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "An error occurred while fetching reviews. Please try again later." },
      { status: 500 }
    );
  }
}