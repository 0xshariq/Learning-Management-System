import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import { Course } from "@/models/course";
import { Coupon, couponSchema } from "@/models/coupon";

type SuccessResponse = {
  success: true;
  coupon: {
    code: string;
    discountPercentage?: number;
    discountAmount?: number;
    expiresAt: string;
  };
  discount: number;
  finalPrice: number;
  message: string;
};

type ErrorResponse = {
  success: false;
  error: string;
  reason?: "not_found" | "expired" | "invalid";
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  await dbConnect();

  const { courseId } = await context.params;
  let code: string | undefined;

  try {
    const body = await req.json();
    // Validate coupon code using Zod
    const parsed = couponSchema.pick({ code: true }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid coupon code",
          reason: "invalid",
        } as ErrorResponse,
        { status: 400 }
      );
    }
    code = parsed.data.code.toUpperCase().trim();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body",
        reason: "invalid",
      } as ErrorResponse,
      { status: 400 }
    );
  }

  if (!courseId || !code) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing courseId or coupon code",
        reason: "invalid",
      } as ErrorResponse,
      { status: 400 }
    );
  }

  try {
    // Find course
    const course = await Course.findById(courseId).lean();
    if (!course) {
      return NextResponse.json(
        {
          success: false,
          error: "Course not found",
          reason: "not_found",
        } as ErrorResponse,
        { status: 404 }
      );
    }

    // Find coupon in Coupon model
    const coupon = await Coupon.findOne({
      code: code,
      course: courseId,
    }).lean();

    if (
      !coupon ||
      typeof coupon.code !== "string" ||
      coupon.code.toUpperCase().trim() !== code
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid coupon code",
          reason: "invalid",
        } as ErrorResponse,
        { status: 404 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(coupon.expiresAt);
    if (isNaN(expiresAt.getTime()) || expiresAt < now) {
      return NextResponse.json(
        {
          success: false,
          error: "Coupon has expired",
          reason: "expired",
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Calculate discount and final price
    let discount = 0;
    let finalPrice = course.price;

    if (coupon.discountPercentage) {
      discount = Math.round((course.price * coupon.discountPercentage) / 100);
    } else if (coupon.discountAmount) {
      discount = coupon.discountAmount;
    }
    finalPrice = Math.max(0, course.price - discount);

    return NextResponse.json(
      {
        success: true,
        coupon: {
          code: coupon.code,
          discountPercentage: coupon.discountPercentage,
          discountAmount: coupon.discountAmount,
          expiresAt: coupon.expiresAt,
        },
        discount,
        finalPrice,
        message: "Coupon applied successfully",
      } as SuccessResponse,
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ErrorResponse,
      { status: 500 }
    );
  }
}