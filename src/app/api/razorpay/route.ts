import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import dbConnect from "@/lib/dbConnect"
import { Course } from "@/models/course"
import { Payment, paymentValidationSchema } from "@/models/payment"
import { Coupon } from "@/models/coupon"
import { Student } from "@/models/student"
import { Sale } from "@/models/sales"
import { z } from "zod"
import crypto from "crypto"
import Razorpay from "razorpay"
import { authOptions } from "@/lib/auth"

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables")
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// Helper function to get sale pricing
async function getSalePricing(courseId: string) {
  try {
    const activeSale = await Sale.findOne({
      course: courseId,
      saleTime: { $lte: new Date() },
      expiryTime: { $gte: new Date() }
    })

    if (activeSale) {
      return {
        hasSale: true,
        salePrice: activeSale.amount,
        saleData: activeSale
      }
    }

    return { hasSale: false, salePrice: null, saleData: null }
  } catch (error) {
    console.error("Error fetching sale data:", error)
    return { hasSale: false, salePrice: null, saleData: null }
  }
}

// Helper function to get coupon pricing
async function getCouponPricing(courseId: string, couponCode: string, basePrice: number) {
  try {
    const coupon = await Coupon.findOne({
      code: couponCode,
      expiresAt: { $gt: new Date() },
      $or: [{ course: courseId }, { course: { $exists: false } }]
    })

    if (coupon) {
      let discountAmount = 0
      
      // Check if it's percentage discount or fixed amount discount
      if (coupon.discountPercentage) {
        discountAmount = basePrice * (coupon.discountPercentage / 100)
      } else if (coupon.discountAmount) {
        discountAmount = coupon.discountAmount
      }

      const finalPrice = Math.max(basePrice - discountAmount, 1) // Minimum ₹1

      return {
        hasCoupon: true,
        discountAmount,
        finalPrice,
        couponData: coupon
      }
    }

    return { hasCoupon: false, discountAmount: 0, finalPrice: basePrice, couponData: null }
  } catch (error) {
    console.error("Error fetching coupon data:", error)
    return { hasCoupon: false, discountAmount: 0, finalPrice: basePrice, couponData: null }
  }
}

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
      return NextResponse.json({ 
        message: "Invalid input data", 
        errors: validation.error.format() 
      }, { status: 400 })
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

    // Start with original course price
    let amount = course.price
    let appliedSale = null
    let appliedCoupon = null

    // 1. First check for active sales on this course
    const saleResult = await getSalePricing(courseId)
    if (saleResult.hasSale) {
      appliedSale = saleResult.saleData
      amount = saleResult.salePrice
      console.log(`Sale applied: Original price ₹${course.price} -> Sale price ₹${amount}`)
    }

    // 2. Then check for coupon (applied on top of sale price if sale exists)
    if (couponCode) {
      const couponResult = await getCouponPricing(courseId, couponCode, amount)
      if (couponResult.hasCoupon) {
        appliedCoupon = couponResult.couponData
        amount = couponResult.finalPrice
        console.log(`Coupon applied: Discount ₹${couponResult.discountAmount} -> Final price ₹${amount}`)
      } else {
        return NextResponse.json({ 
          message: "Invalid or expired coupon code" 
        }, { status: 400 })
      }
    }

    // Ensure minimum amount (₹1)
    amount = Math.max(amount, 1)

    // Create Razorpay order with all necessary information in notes
    const notes: Record<string, string> = {
      courseId: courseId,
      userId: userId,
      originalPrice: course.price.toString(),
      finalAmount: amount.toString(),
      paymentOption: paymentOption || "upi",
    }

    if (appliedSale) {
      notes.saleId = appliedSale._id.toString()
      notes.salePrice = appliedSale.amount.toString()
    }

    if (appliedCoupon) {
      notes.couponId = appliedCoupon._id.toString()
      notes.couponCode = appliedCoupon.code
      if (appliedCoupon.discountPercentage) {
        notes.couponDiscount = appliedCoupon.discountPercentage.toString()
        notes.couponType = "percentage"
      } else if (appliedCoupon.discountAmount) {
        notes.couponDiscount = appliedCoupon.discountAmount.toString()
        notes.couponType = "fixed"
      }
    }

    if (paymentOption === "card" && cardBrand) {
      notes.cardBrand = cardBrand
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
      notes,
    }

    const order = await razorpay.orders.create(options)

    // Prepare response with pricing breakdown
    const pricingBreakdown = {
      originalPrice: course.price,
      saleDiscount: appliedSale ? course.price - appliedSale.amount : 0,
      couponDiscount: appliedCoupon ? 
        (appliedCoupon.discountPercentage ? 
          (appliedSale ? appliedSale.amount : course.price) * (appliedCoupon.discountPercentage / 100) :
          appliedCoupon.discountAmount || 0
        ) : 0,
      finalAmount: amount,
      savings: course.price - amount
    }

    return NextResponse.json({
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
      pricingBreakdown,
      appliedSale: appliedSale ? {
        id: appliedSale._id,
        salePrice: appliedSale.amount,
        saleTime: appliedSale.saleTime,
        expiryTime: appliedSale.expiryTime
      } : null,
      appliedCoupon: appliedCoupon ? {
        id: appliedCoupon._id,
        code: appliedCoupon.code,
        discountPercentage: appliedCoupon.discountPercentage,
        discountAmount: appliedCoupon.discountAmount
      } : null
    }, { status: 200 })

  } catch (error) {
    console.error("Razorpay error:", error)
    return NextResponse.json({ 
      message: "Failed to create payment order",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentOption } = body

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
    const orderPaymentOption = notes.paymentOption
    const originalPrice = parseFloat(notes.originalPrice || "0")
    const finalAmount = parseFloat(notes.finalAmount || "0")

    if (!orderUserId || !orderCourseId) {
      return NextResponse.json({ message: "Invalid order data" }, { status: 400 })
    }

    // Verify the user making the payment
    if (orderUserId !== session.user.id) {
      return NextResponse.json({ message: "User mismatch in payment verification" }, { status: 403 })
    }

    // Create payment record with all applied discounts
    const paymentData = {
      student: orderUserId,
      course: orderCourseId,
      amount: finalAmount,
      originalAmount: originalPrice,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      paymentOption: orderPaymentOption || paymentOption || "upi",
      status: "completed",
    }

    const payment = await Payment.create(paymentData)

    // Update user's purchased courses
    await Student.findByIdAndUpdate(orderUserId, {
      $addToSet: { purchasedCourses: orderCourseId }
    })

    // Update course's students purchased and total revenue
    await Course.findByIdAndUpdate(orderCourseId, {
      $addToSet: { studentsPurchased: orderUserId },
      $inc: { 
        totalRevenue: finalAmount,
        totalStudents: 1
      }
    })

    // Get the created payment with populated fields for response
    const populatedPayment = await Payment.findById(payment._id)
      .populate('course', 'name price')
      .populate('student', 'name email')
      .populate('couponApplied', 'code discountPercentage discountAmount')
      .populate('saleApplied', 'amount saleTime expiryTime')
      .lean()

    return NextResponse.json({
      message: "Payment verified successfully",
      payment: {
        id: populatedPayment._id,
        amount: populatedPayment.amount,
        originalAmount: populatedPayment.originalAmount,
        status: populatedPayment.status,
        paymentOption: populatedPayment.paymentOption,
        cardBrand: populatedPayment.cardBrand,
        course: populatedPayment.course,
        couponApplied: populatedPayment.couponApplied,
        saleApplied: populatedPayment.saleApplied,
        createdAt: populatedPayment.createdAt
      },
      savings: originalPrice - finalAmount,
      transactionId: razorpay_payment_id
    }, { status: 200 })

  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json({ 
      message: "Failed to verify payment",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}