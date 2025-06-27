import { NextRequest, NextResponse } from "next/server";
import { refundSchema, Refund } from "@/models/refund";
import { dbConnect } from "@/lib/dbConnect";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Payment } from "@/models/payment";
import { Course } from "@/models/course";
import { Student } from "@/models/student";
import Razorpay from "razorpay";

// Initialize Razorpay instance (use your keys from env)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export async function POST(req: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  // Only students can apply for a refund
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized. Only students can request refunds." }, { status: 401 });
  }

  let data;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON format." }, { status: 400 });
  }

  // Extract additional data from the request
  const { courseId, price, razorpayPaymentId, ...formData } = data;

  // Validate required fields
  if (!courseId || !razorpayPaymentId) {
    return NextResponse.json({ 
      error: "Missing required fields: courseId and razorpayPaymentId are required." 
    }, { status: 400 });
  }

  try {
    // 1. Verify course exists and student is enrolled
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const student = await Student.findById(session.user.id);
    if (!student || !student.purchasedCourses?.includes(courseId)) {
      return NextResponse.json({ 
        error: "You are not enrolled in this course or not eligible for refund." 
      }, { status: 403 });
    }

    // 2. Find payment record using razorpayPaymentId
    const payment = await Payment.findOne({ 
      razorpayPaymentId: razorpayPaymentId,
      student: session.user.id,
      course: courseId 
    });

    if (!payment) {
      return NextResponse.json({ 
        error: "Payment record not found. Please check your payment ID." 
      }, { status: 404 });
    }

    // 3. Check if refund already exists for this payment
    const existingRefund = await Refund.findOne({ 
      razorpayPaymentId: razorpayPaymentId,
      student: session.user.id 
    });

    if (existingRefund) {
      return NextResponse.json({ 
        error: "Refund request already exists for this payment." 
      }, { status: 400 });
    }

    // 4. Prepare refund data for validation
    const refundData = {
      course: courseId,
      razorpayPaymentId: payment.razorpayPaymentId,
      razorpayOrderId: payment.razorpayOrderId,
      amount: payment.amount,
      reason: formData.reason,
      refundReasonCategory: formData.refundReasonCategory,
      refundMethod: formData.refundMethod,
      attachments: formData.attachments || []
    };

    // 5. Validate with Zod schema
    const parsed = refundSchema.safeParse(refundData);
    if (!parsed.success) {
      return NextResponse.json({ 
        error: "Validation failed",
        details: parsed.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      }, { status: 400 });
    }

    // 6. Initiate refund with Razorpay
    // Convert amount to paise (multiply by 100)
    const refundAmountInPaise = Math.round(payment.amount * 100);
    
    const refundResponse = await razorpay.payments.refund(razorpayPaymentId, {
      amount: refundAmountInPaise,
      speed: "optimum",
      notes: {
        course: course.name,
        courseId: courseId,
        student: session.user.id,
        studentName: student.name,
        reason: parsed.data.reason || "No reason provided",
        category: parsed.data.refundReasonCategory ?? null
      },
    });

    // 7. Save refund request in DB
    const refundDoc = await Refund.create({
      ...parsed.data,
      student: session.user.id,
      status: refundResponse.status || "pending",
      razorpayRefundId: refundResponse.id,
      razorpayRefundStatus: refundResponse.status,
      razorpayRefundResponse: refundResponse,
    });

    // 8. Update payment status to indicate refund initiated
    await Payment.findByIdAndUpdate(payment._id, {
      refundStatus: "initiated",
      refundId: refundDoc._id
    });

    // 9. Populate references for response
    const populatedRefund = await Refund.findById(refundDoc._id)
      .populate("course", "name price")
      .populate("student", "name email");

    return NextResponse.json({ 
      message: "Refund request submitted successfully.",
      refund: {
        _id: populatedRefund._id,
        status: populatedRefund.status,
        amount: populatedRefund.amount,
        razorpayRefundId: populatedRefund.razorpayRefundId,
        course: populatedRefund.course,
        createdAt: populatedRefund.createdAt
      },
      razorpayResponse: {
        id: refundResponse.id,
        status: refundResponse.status,
        amount: refundResponse.amount
      }
    }, { status: 201 });

  } catch (err) {
    console.error("Refund API Error:", err);
    
    // Handle specific Razorpay errors
    if (err instanceof Error && err.message.includes("payment")) {
      return NextResponse.json({
        error: "Payment not found or invalid payment ID.",
        details: "Please check your payment ID and try again."
      }, { status: 400 });
    }

    // Handle Razorpay API errors
    if (typeof err === "object" && err !== null && "error" in err) {
      return NextResponse.json({
        error: "Razorpay refund failed.",
        details: err.error || "Unable to process refund with payment gateway."
      }, { status: 500 });
    }

    return NextResponse.json({
      error: "An unexpected error occurred while processing your refund request.",
      details: err instanceof Error ? err.message : "Unknown error"
    }, { status: 500 });
  }
}

// GET endpoint to fetch user's refund requests
export async function GET(req: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const refunds = await Refund.find({ student: session.user.id })
      .populate("course", "name price")
      .sort({ createdAt: -1 });

    return NextResponse.json({ refunds }, { status: 200 });
  } catch (err) {
    console.error("Get Refunds Error:", err);
    return NextResponse.json({
      error: "Failed to fetch refund requests."
    }, { status: 500 });
  }
}