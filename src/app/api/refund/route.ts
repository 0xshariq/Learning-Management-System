import { NextRequest, NextResponse } from "next/server";
import { refundSchema, Refund } from "@/models/refund";
import { dbConnect } from "@/lib/dbConnect";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let data;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate with Zod
  const parsed = refundSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Ensure required references are provided
  const { course, razorpayPaymentId, razorpayOrderId, refundAmount } = parsed.data;
  if (!course || !razorpayPaymentId || !razorpayOrderId) {
    return NextResponse.json({ error: "Missing required reference fields." }, { status: 400 });
  }

  try {
    // 1. Initiate refund with Razorpay
    // refundAmount should be in paise (e.g., 10000 for ₹100)
    const refundResponse = await razorpay.payments.refund(razorpayPaymentId, {
      amount: refundAmount, // amount in paise, optional (if not provided, full refund)
      speed: "optimum",
      notes: {
        course,
        student: session.user.id,
        reason: parsed.data.reason || "No reason provided",
      },
    });

    // 2. Save refund request in DB
    const refundDoc = await Refund.create({
      ...parsed.data,
      student: session.user.id,
      status: refundResponse.status || "pending",
      razorpayRefundId: refundResponse.id,
      razorpayRefundStatus: refundResponse.status,
      razorpayRefundResponse: refundResponse,
    });

    // 3. Populate references for response
    const populatedRefund = await Refund.findById(refundDoc._id)
      .populate("course")
      .populate("student");

    return NextResponse.json({ refund: populatedRefund, razorpay: refundResponse }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({
      error: "Failed to create refund",
      details: err?.message || err,
      razorpayError: err?.error || undefined,
    }, { status: 500 });
  }
}