import { NextRequest, NextResponse } from "next/server";
import { refundSchema, Refund } from "@/models/refund";
import { dbConnect } from "@/lib/dbConnect";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Payment } from "@/models/payment";
import { Course } from "@/models/course";
import { Student } from "@/models/student";
import { RequestRefund } from "@/models/request-refund";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  // Only students can process refunds
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized. Only students can process refunds." }, { status: 401 });
  }

  let data;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON format." }, { status: 400 });
  }

  // Extract data from the request
  const { 
    courseId, 
    studentId, 
    amount, 
    razorpayPaymentId, 
    refundMethod = "original" 
  } = data;

  // Validate required fields
  if (!courseId || !studentId || !amount || !razorpayPaymentId) {
    return NextResponse.json({ 
      error: "Missing required fields: courseId, studentId, amount, and razorpayPaymentId are required." 
    }, { status: 400 });
  }

  // Ensure the logged-in user is the same as the studentId
  if (session.user.id !== studentId) {
    return NextResponse.json({ 
      error: "You can only process refunds for your own account." 
    }, { status: 403 });
  }

  try {
    // 1. Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    // 2. Verify student exists and is enrolled
    const student = await Student.findById(studentId);
    if (!student || !student.purchasedCourses?.includes(courseId)) {
      return NextResponse.json({ 
        error: "Student not found or not enrolled in this course." 
      }, { status: 403 });
    }

    // 3. Verify there's an approved refund request for this course and student
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

    // 4. Find payment record using razorpayPaymentId
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

    // 5. Verify the amount matches the payment amount
    if (Math.abs(payment.amount - amount) > 0.01) { // Allow small floating point differences
      return NextResponse.json({ 
        error: "Refund amount does not match the original payment amount." 
      }, { status: 400 });
    }

    // 6. Check if refund already exists for this payment
    const existingRefund = await Refund.findOne({ 
      razorpayPaymentId: razorpayPaymentId,
      studentId: studentId 
    });

    if (existingRefund) {
      return NextResponse.json({ 
        error: "Refund already processed for this payment." 
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
        requestId: approvedRefundRequest._id.toString()
      },
      receipt: `refund_${courseId}_${studentId}_${Date.now()}`
    });

    // 9. Prepare refund data for validation
    const refundData = {
      courseId: courseId,
      studentId: studentId,
      razorpayPaymentId: razorpayPaymentId,
      amount: amount,
      refundId: razorpayRefundResponse.id, // Store refund ID from Razorpay response
      status: "processed",
      refundedAt: new Date(),
      refundMethod: refundMethod,
      processedBy: approvedRefundRequest.processedBy.toString() // Teacher who approved the request
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
      refundedAt: new Date()
    });

    // 13. Update the refund request status to completed
    await RequestRefund.findByIdAndUpdate(approvedRefundRequest._id, {
      requestStatus: "completed",
      processedAt: new Date(),
      refundId: refundDoc._id
    });

    // 14. Populate references for response
    const populatedRefund = await Refund.findById(refundDoc._id)
      .populate("courseId", "name price")
      .populate("studentId", "name email")
      .populate("processedBy", "name email");

    return NextResponse.json({ 
      message: "Refund processed successfully.",
      refundId: razorpayRefundResponse.id, // Return Razorpay refund ID
      refund: {
        _id: populatedRefund._id,
        status: populatedRefund.status,
        amount: populatedRefund.amount,
        refundId: populatedRefund.refundId,
        refundMethod: populatedRefund.refundMethod,
        refundedAt: populatedRefund.refundedAt,
        course: populatedRefund.courseId,
        createdAt: populatedRefund.createdAt
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
      }
    }, { status: 201 });

  } catch (err) {
    console.error("Refund Processing Error:", err);
    
    // Handle specific Razorpay errors
    if (err instanceof Error && err.message.includes("BAD_REQUEST_ERROR")) {
      return NextResponse.json({
        error: "Invalid payment ID or refund request.",
        details: "Please check your payment ID and try again."
      }, { status: 400 });
    }

    // Handle Razorpay API errors
    if (typeof err === "object" && err !== null && "error" in err) {
      const razorpayError = err as any;
      return NextResponse.json({
        error: "Razorpay refund failed.",
        details: razorpayError.error?.description || razorpayError.message || "Unable to process refund with payment gateway.",
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

// GET endpoint to fetch user's refund records
export async function GET(req: NextRequest) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const refunds = await Refund.find({ studentId: session.user.id })
      .populate("courseId", "name price")
      .populate("processedBy", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({ 
      refunds: refunds.map(refund => ({
        _id: refund._id,
        amount: refund.amount,
        status: refund.status,
        refundId: refund.refundId,
        refundMethod: refund.refundMethod,
        refundedAt: refund.refundedAt,
        course: refund.courseId,
        processedBy: refund.processedBy,
        createdAt: refund.createdAt,
        updatedAt: refund.updatedAt
      }))
    }, { status: 200 });
  } catch (err) {
    console.error("Get Refunds Error:", err);
    return NextResponse.json({
      error: "Failed to fetch refund records."
    }, { status: 500 });
  }
}