import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import { Coupon, couponSchema } from "@/models/coupon";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  await dbConnect();
  const { courseId } = await context.params;

  try {
    const body = await req.json();
    // Validate full coupon data using Zod
    const parsed = couponSchema.safeParse({ ...body, course: courseId });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    // Upsert (create or update) coupon for this course
    const coupon = await Coupon.findOneAndUpdate(
      { course: courseId },
      {
        ...parsed.data,
        code: parsed.data.code.toUpperCase().trim(),
        course: courseId,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, coupon }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

// Optionally, add GET for fetching the coupon for a course
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  await dbConnect();
  const { courseId } = await context.params;
  const coupon = await Coupon.findOne({ course: courseId }).lean();
  return NextResponse.json({ coupon }, { status: 200 });
}