import mongoose from "mongoose"
import { z } from "zod"

const paymentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  amount: { type: Number, required: true },
  razorpayPaymentId: { type: String, required: true }, // you get this from Razorpay success
  razorpayOrderId: { type: String },
  couponApplied: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
})

export const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema)

export const paymentValidationSchema = z.object({
  student: z.string(),
  course: z.string(),
  amount: z.number().min(0, "Amount cannot be negative"),
  razorpayPaymentId: z.string(),
  razorpayOrderId: z.string().optional(),
  couponApplied: z.string().optional(),
  status: z.enum(["pending", "completed", "failed"]).default("pending"),
})

export type PaymentType = z.infer<typeof paymentValidationSchema>
