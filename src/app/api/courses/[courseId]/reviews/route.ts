import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { dbConnect } from "@/lib/dbConnect";
import { Review } from "@/models/review";
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

    const { rating, comment, courseId } = await request.json();

    // Validate courseId
    if (!courseId || typeof courseId !== "string") {
      return NextResponse.json({ message: "Invalid course ID provided." }, { status: 400 });
    }

    // Validate rating
    if (
      rating === undefined ||
      rating === null ||
      rating < 1 ||
      rating > 5 ||
      !Number.isInteger(rating)
    ) {
      return NextResponse.json(
        { message: "Rating must be a whole number between 1 and 5." },
        { status: 400 }
      );
    }

    // Validate comment
    if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
      return NextResponse.json(
        { message: "Review comment is required and cannot be empty." },
        { status: 400 }
      );
    }

    if (comment.trim().length < 10) {
      return NextResponse.json(
        { message: "Review comment must be at least 10 characters long." },
        { status: 400 }
      );
    }

    if (comment.trim().length > 1000) {
      return NextResponse.json(
        { message: "Review comment must be less than 1000 characters." },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json(
        { message: "Course not found. Unable to submit review." },
        { status: 404 }
      );
    }

    // Check if student is enrolled
    const student = await Student.findById(session.user.id);
    if (!student || !student.purchasedCourses?.includes(courseId)) {
      return NextResponse.json(
        { message: "You must be enrolled in this course to leave a review. Please enroll first." },
        { status: 403 }
      );
    }

    // Check if student has already reviewed this course
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

    // Create the review
    const review = await Review.create({
      rating,
      comment: comment.trim(),
      student: session.user.id,
      course: courseId,
    });

    // Populate the review with student data
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

    // Extract courseId from the URL path (supports /api/courses/[courseId]/reviews)
    const url = request.nextUrl;
    const segments = url.pathname.split("/").filter(Boolean);
    // Find the courseId based on the route structure
    // e.g. ["api", "courses", "123", "reviews"] => courseId = "123"
    const courseIdx = segments.findIndex((seg) => seg === "courses");
    const courseId = courseIdx !== -1 && segments.length > courseIdx + 1 ? segments[courseIdx + 1] : null;

    if (!courseId || typeof courseId !== "string") {
      return NextResponse.json({ message: "Invalid course ID provided." }, { status: 400 });
    }

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