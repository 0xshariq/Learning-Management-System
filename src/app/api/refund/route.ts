import { NextRequest, NextResponse } from "next/server";
import { refundSchema, Refund } from "@/models/refund";
import { dbConnect } from "@/lib/dbConnect";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
  const { course, razorpayPaymentId, razorpayOrderId } = parsed.data;
  if (!course || !razorpayPaymentId || !razorpayOrderId) {
    return NextResponse.json({ error: "Missing required reference fields." }, { status: 400 });
  }

  try {
    // The student field is set from the session
    const refundDoc = await Refund.create({
      ...parsed.data,
      student: session.user.id,
      status: "pending",
    });

    // Populate references for response
    const populatedRefund = await Refund.findById(refundDoc._id)
      .populate("course")
      .populate("student");

    return NextResponse.json({ refund: populatedRefund }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create refund", details: err }, { status: 500 });
  }
}