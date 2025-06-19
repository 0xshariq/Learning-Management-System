import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import dbConnect from "@/lib/dbConnect"
import { Course } from "@/models/course"
import { Payment, paymentValidationSchema } from "@/models/payment"
import { Coupon } from "@/models/coupon"
import { Student } from "@/models/student"
import { z } from "zod"
import crypto from "crypto"
import Razorpay from "razorpay"
import { authOptions } from "@/lib/auth"


if(!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables")
}
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    // Use the paymentValidationSchema from the model for validation
    const validation = paymentValidationSchema
      .omit({ student: true, course: true, amount: true, razorpayPaymentId: true, status: true })
      .extend({
        courseId: z.string(),
        couponCode: z.string().optional(),
      })
      .safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ message: "Invalid input data", errors: validation.error.format() }, { status: 400 })
    }

    await dbConnect()

    const { courseId, couponCode, paymentOption, cardBrand } = validation.data
    const userId = session.user.id

    // Get course details
    const course = await Course.findById(courseId)
    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 })
    }

    // Check if user already purchased the course
    const student = await Student.findById(userId)
    if (student?.purchasedCourses?.includes(courseId)) {
      return NextResponse.json({ message: "You have already purchased this course" }, { status: 400 })
    }

    // Calculate amount with coupon if provided
    let amount = course.price
    let coupon = null

    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode,
        expiresAt: { $gt: new Date() },
        $or: [{ course: courseId }, { course: { $exists: false } }],
      })

      if (coupon) {
        amount = amount * (1 - coupon.discountPercentage / 100)
      }
    }

    // Create Razorpay order
    const notes: Record<string, string | null> = {
      courseId: courseId,
      userId: userId,
      couponId: coupon ? coupon._id.toString() : null,
      paymentOption: paymentOption || "upi",
    }
    if (paymentOption === "card" && cardBrand) {
      notes.cardBrand = cardBrand
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in smallest currency unit (paise) in INR only
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
      notes,
    }

    const order = await razorpay.orders.create(options)

    return NextResponse.json(
      {
        order,
        key: process.env.RAZORPAY_KEY_ID,
        amount: Math.round(amount * 100),
        currency: "INR",
        name: course.name,
        description: `Payment for ${course.name}`,
        orderId: order.id,
        prefill: {
          name: session.user.name,
          email: session.user.email,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Razorpay error:", error)
    return NextResponse.json({ message: "Failed to create payment order" }, { status: 500 })
  }
}

// Verify payment
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentOption, cardBrand } = body

    // Verify signature
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex")

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ message: "Invalid payment signature" }, { status: 400 })
    }

    await dbConnect()

    // Get order details from Razorpay
    const order = await razorpay.orders.fetch(razorpay_order_id)

    // Access notes safely with type assertion
    const notes = order.notes as Record<string, string> | undefined

    if (!notes) {
      return NextResponse.json({ message: "Order notes not found" }, { status: 400 })
    }

    const orderUserId = notes.userId
    const orderCourseId = notes.courseId
    const orderCouponId = notes.couponId
    const orderPaymentOption = notes.paymentOption
    const orderCardBrand = notes.cardBrand

    if (!orderUserId || !orderCourseId) {
      return NextResponse.json({ message: "Invalid order data" }, { status: 400 })
    }

    // Create payment record
    const payment = await Payment.create({
      student: orderUserId,
      course: orderCourseId,
      amount: Number(order.amount) / 100,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      couponApplied: orderCouponId || undefined,
      paymentOption: orderPaymentOption || paymentOption || "upi",
      cardBrand: orderCardBrand || cardBrand,
      status: "completed",
    })

    // Update user's purchased courses
    await Student.findByIdAndUpdate(orderUserId, {
      $addToSet: { purchasedCourses: orderCourseId },
    })

    // Update course's students purchased
    await Course.findByIdAndUpdate(orderCourseId, {
      $addToSet: { studentsPurchased: orderUserId },
    })

    return NextResponse.json(
      {
        message: "Payment verified successfully",
        payment: {
          id: payment._id,
          amount: payment.amount,
          status: payment.status,
          paymentOption: payment.paymentOption,
          cardBrand: payment.cardBrand,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json({ message: "Failed to verify payment" }, { status: 500 })
  }
}