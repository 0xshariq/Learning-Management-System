import { NextRequest, NextResponse } from "next/server";
import { refundSchema, Refund } from "@/models/refund";
import { dbConnect } from "@/lib/dbConnect";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Payment } from "@/models/payment";
import { Course } from "@/models/course";
import { Student } from "@/models/student";
import { RequestRefund } from "@/models/request-refund";
import { Teacher } from "@/models/teacher";
import Razorpay from "razorpay";
import { z } from "zod";

// Enhanced validation schema
const enhancedRefundSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  studentId: z.string().min(1, "Student ID is required"),
  razorpayPaymentId: z.string().min(1, "Razorpay Payment ID is required"),
  refundMethod: z.enum(["original", "manual", "wallet"]).default("original"),
  refundReason: z.string().optional(),
  bankDetails: z.object({
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    accountHolderName: z.string().optional(),
  }).optional(),
  contactInfo: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
});

interface RefundCourse {
  _id: string;
  name: string;
  price: number;
  teacher: string;
}

interface RefundProcessedBy {
  _id: string;
  name: string;
  email: string;
}

interface RefundResponse {
  _id: string;
  amount: number;
  status: string;
  refundId: string;
  refundMethod: string;
  refundedAt: Date;
  course: RefundCourse;
  processedBy: RefundProcessedBy;
  createdAt: Date;
  updatedAt: Date;
  refundReason?: string;
  bankDetails?: {
    accountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
  };
  contactInfo?: {
    email?: string;
    phone?: string;
  };
}

interface RefundAnalytics {
  totalRefunds: number;
  totalAmount: number;
  averageRefundAmount: number;
  refundsByMethod: {
    original: number;
    manual: number;
    wallet: number;
  };
  refundsByStatus: {
    processed: number;
    pending: number;
    failed: number;
  };
}

export async function POST(req: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  
  // Enhanced authorization check
  if (!session || !session.user) {
    return NextResponse.json({ 
      error: "Unauthorized. Please sign in to process refunds." 
    }, { status: 401 });
  }

  // Only students can process refunds
  if (session.user.role !== "student") {
    return NextResponse.json({ 
      error: "Unauthorized. Only students can process refunds." 
    }, { status: 401 });
  }

  let data;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ 
      error: "Invalid JSON format in request body." 
    }, { status: 400 });
  }

  // Validate request data
  const validation = enhancedRefundSchema.safeParse(data);
  if (!validation.success) {
    return NextResponse.json({
      error: "Validation failed",
      details: validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
    }, { status: 400 });
  }

  const {
    courseId,
    studentId,
    razorpayPaymentId,
    refundMethod = "original",
    refundReason,
    bankDetails,
    contactInfo,
  } = validation.data;

  // Ensure the logged-in user is the same as the studentId
  if (session.user.id !== studentId) {
    return NextResponse.json({
      error: "You can only process refunds for your own account."
    }, { status: 403 });
  }

  try {
    // 1. Find payment record first to get the amount
    const payment = await Payment.findOne({
      razorpayPaymentId: razorpayPaymentId,
      student: studentId,
      course: courseId
    });

    if (!payment) {
      return NextResponse.json({
        error: "Payment record not found. Please check your payment ID."
      }, { status: 404 });
    }

    // Get the amount from payment record
    const amount = payment.amount;
    if (!amount || amount <= 0) {
      return NextResponse.json({
        error: "Invalid payment amount. Cannot process refund."
      }, { status: 400 });
    }

    // 2. Verify course exists and get course details
    const course = await Course.findById(courseId).populate('teacher', 'name email');
    if (!course) {
      return NextResponse.json({ 
        error: "Course not found." 
      }, { status: 404 });
    }

    // 3. Verify student exists and is enrolled
    const student = await Student.findById(studentId);
    if (!student || !student.purchasedCourses?.includes(courseId)) {
      return NextResponse.json({
        error: "Student not found or not enrolled in this course."
      }, { status: 403 });
    }

    // 4. Verify there's an approved refund request for this course and student
    const approvedRefundRequest = await RequestRefund.findOne({
      courseId: courseId,
      studentId: studentId,
      requestStatus: "accepted"
    });

    if (!approvedRefundRequest) {
      return NextResponse.json({
        error: "No approved refund request found for this course. Please submit a refund request first."
      }, { status: 404 });
    }

    // 5. Check if refund already exists for this payment
    const existingRefund = await Refund.findOne({
      razorpayPaymentId: razorpayPaymentId,
      studentId: studentId
    });

    if (existingRefund) {
      return NextResponse.json({
        error: "Refund already processed for this payment.",
        refundId: existingRefund.refundId,
        status: existingRefund.status
      }, { status: 400 });
    }

    // 6. Validate bank details for manual refund
    if (refundMethod === "manual" && (!bankDetails?.accountNumber || !bankDetails?.ifscCode)) {
      return NextResponse.json({
        error: "Bank account details are required for manual refund method."
      }, { status: 400 });
    }

    // 7. Create Razorpay instance
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "",
      key_secret: process.env.RAZORPAY_KEY_SECRET || ""
    });

    // 8. Initiate refund with Razorpay
    // Convert amount to paise (multiply by 100)
    const refundAmountInPaise = Math.round(amount * 100);

    const razorpayRefundResponse = await instance.payments.refund(razorpayPaymentId, {
      amount: refundAmountInPaise,
      speed: refundMethod === "original" ? "normal" : "optimum",
      notes: {
        course: course.name,
        courseId: courseId,
        student: studentId,
        studentName: student.name,
        refundMethod: refundMethod,
        requestId: approvedRefundRequest._id.toString(),
        refundReason: refundReason || "Student requested refund",
        processedBy: approvedRefundRequest.processedBy?.toString() || "system"
      },
      receipt: `refund_${courseId}_${studentId}_${Date.now()}`,
      ...(refundMethod === "manual" && bankDetails && {
        bank_account: {
          account_number: bankDetails.accountNumber,
          ifsc: bankDetails.ifscCode,
          name: bankDetails.accountHolderName || student.name
        }
      })
    });

    // 9. Prepare refund data for validation
    const refundData = {
      courseId: courseId,
      studentId: studentId,
      razorpayPaymentId: razorpayPaymentId,
      amount: amount,
      refundId: razorpayRefundResponse.id,
      status: "processed",
      refundedAt: new Date(),
      refundMethod: refundMethod,
      processedBy: approvedRefundRequest.processedBy?.toString() || session.user.id,
      refundReason,
      bankDetails,
      contactInfo
    };

    // 10. Validate with Zod schema
    const parsed = refundSchema.safeParse(refundData);
    if (!parsed.success) {
      return NextResponse.json({
        error: "Validation failed",
        details: parsed.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      }, { status: 400 });
    }

    // 11. Save refund record in DB
    const refundDoc = await Refund.create(refundData);

    // 12. Update payment status to indicate refund completed
    await Payment.findByIdAndUpdate(payment._id, {
      refundStatus: "completed",
      refundId: refundDoc._id,
      refundedAt: new Date(),
      refundMethod,
      refundReason
    });

    // 13. Update the refund request status to completed
    await RequestRefund.findByIdAndUpdate(approvedRefundRequest._id, {
      requestStatus: "completed",
      processedAt: new Date(),
      refundId: refundDoc._id,
      refundMethod,
      refundReason
    });

    // 14. Remove course from student's purchased courses
    await Student.findByIdAndUpdate(studentId, {
      $pull: { purchasedCourses: courseId }
    });

    // 15. Remove student from course's purchased students and update revenue
    await Course.findByIdAndUpdate(courseId, {
      $pull: { studentsPurchased: studentId },
      $inc: {
        totalRevenue: -amount,
        totalStudents: -1
      }
    });

    // 16. Update teacher's earnings if applicable
    if (course.teacher) {
      await Teacher.findByIdAndUpdate(course.teacher, {
        $inc: { totalEarnings: -amount }
      });
    }

    // 17. Populate references for response
    const populatedRefund = await Refund.findById(refundDoc._id)
      .populate("courseId", "name price teacher")
      .populate("studentId", "name email")
      .populate("processedBy", "name email")
      .lean();

    return NextResponse.json({
      message: "Refund processed successfully.",
      refundId: razorpayRefundResponse.id,
      refund: {
        _id: populatedRefund._id.toString(),
        status: populatedRefund.status,
        amount: populatedRefund.amount,
        refundId: populatedRefund.refundId,
        refundMethod: populatedRefund.refundMethod,
        refundedAt: populatedRefund.refundedAt,
        course: {
          _id: populatedRefund.courseId._id.toString(),
          name: populatedRefund.courseId.name,
          price: populatedRefund.courseId.price,
          teacher: populatedRefund.courseId.teacher?.toString()
        },
        processedBy: populatedRefund.processedBy ? {
          _id: populatedRefund.processedBy._id.toString(),
          name: populatedRefund.processedBy.name,
          email: populatedRefund.processedBy.email
        } : null,
        refundReason: populatedRefund.refundReason,
        bankDetails: populatedRefund.bankDetails,
        contactInfo: populatedRefund.contactInfo,
        createdAt: populatedRefund.createdAt,
        updatedAt: populatedRefund.updatedAt
      },
      razorpayResponse: {
        id: razorpayRefundResponse.id,
        entity: razorpayRefundResponse.entity,
        amount: razorpayRefundResponse.amount,
        currency: razorpayRefundResponse.currency,
        payment_id: razorpayRefundResponse.payment_id,
        status: razorpayRefundResponse.status,
        speed_processed: razorpayRefundResponse.speed_processed,
        speed_requested: razorpayRefundResponse.speed_requested,
        created_at: razorpayRefundResponse.created_at
      },
      estimatedProcessingTime: getEstimatedProcessingTime(refundMethod)
    }, { status: 201 });

  } catch (err) {
    console.error("Enhanced Refund Processing Error:", err);

    // Handle specific Razorpay errors
    if (err instanceof Error && err.message.includes("BAD_REQUEST_ERROR")) {
      return NextResponse.json({
        error: "Invalid payment ID or refund request.",
        details: "Please check your payment ID and try again."
      }, { status: 400 });
    }

    // Handle Razorpay API errors
    if (typeof err === "object" && err !== null && "error" in err) {
      const razorpayError = err as { error: { code?: string; description?: string; message?: string } };
      return NextResponse.json({
        error: "Razorpay refund failed.",
        details: razorpayError.error?.description || razorpayError.error?.message || "Unable to process refund with payment gateway.",
        code: razorpayError.error?.code || "RAZORPAY_ERROR"
      }, { status: 500 });
    }

    // Handle network or other errors
    if (err instanceof Error && err.message.includes("ECONNREFUSED")) {
      return NextResponse.json({
        error: "Connection to payment gateway failed.",
        details: "Please try again later."
      }, { status: 503 });
    }

    return NextResponse.json({
      error: "An unexpected error occurred while processing your refund.",
      details: err instanceof Error ? err.message : "Unknown error"
    }, { status: 500 });
  }
}

// GET endpoint to fetch user's refund records with analytics
export async function GET(req: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const includeAnalytics = searchParams.get('analytics') === 'true';

    const refunds = await Refund.find({ studentId: session.user.id })
      .populate("courseId", "name price teacher")
      .populate("processedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const response: { refunds: RefundResponse[]; analytics?: RefundAnalytics } = {
      refunds: refunds.map((refund: any): RefundResponse => ({
        _id: refund._id.toString(),
        amount: refund.amount,
        status: refund.status,
        refundId: refund.refundId,
        refundMethod: refund.refundMethod,
        refundedAt: refund.refundedAt,
        course: {
          _id: refund.courseId._id.toString(),
          name: refund.courseId.name,
          price: refund.courseId.price,
          teacher: refund.courseId.teacher?.toString()
        },
        processedBy: refund.processedBy ? {
          _id: refund.processedBy._id.toString(),
          name: refund.processedBy.name,
          email: refund.processedBy.email
        } : null,
        refundReason: refund.refundReason,
        bankDetails: refund.bankDetails,
        contactInfo: refund.contactInfo,
        createdAt: refund.createdAt,
        updatedAt: refund.updatedAt
      }))
    };

    // Add analytics if requested
    if (includeAnalytics) {
      const totalRefunds = refunds.length;
      const totalAmount = refunds.reduce((sum, refund) => sum + refund.amount, 0);
      const averageRefundAmount = totalRefunds > 0 ? totalAmount / totalRefunds : 0;

      const refundsByMethod = refunds.reduce((acc, refund) => {
        acc[refund.refundMethod] = (acc[refund.refundMethod] || 0) + 1;
        return acc;
      }, {} as any);

      const refundsByStatus = refunds.reduce((acc, refund) => {
        acc[refund.status] = (acc[refund.status] || 0) + 1;
        return acc;
      }, {} as any);

      response.analytics = {
        totalRefunds,
        totalAmount,
        averageRefundAmount,
        refundsByMethod: {
          original: refundsByMethod.original || 0,
          manual: refundsByMethod.manual || 0,
          wallet: refundsByMethod.wallet || 0,
        },
        refundsByStatus: {
          processed: refundsByStatus.processed || 0,
          pending: refundsByStatus.pending || 0,
          failed: refundsByStatus.failed || 0,
        }
      };
    }

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error("Get Enhanced Refunds Error:", err);
    return NextResponse.json({
      error: "Failed to fetch refund records."
    }, { status: 500 });
  }
}

// Helper function to get estimated processing time
function getEstimatedProcessingTime(refundMethod: string): string {
  switch (refundMethod) {
    case "original":
      return "3-5 business days";
    case "manual":
      return "5-7 business days";
    case "wallet":
      return "Instant";
    default:
      return "3-5 business days";
  }
} 