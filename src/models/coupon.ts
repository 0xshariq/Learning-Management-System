import mongoose from "mongoose"
import { z } from "zod"

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discountPercentage: { type: Number, required: true }, // Example: 20 for 20%
  expiresAt: { type: Date, required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" }, // If coupon is course-specific
  createdAt: { type: Date, default: Date.now },
})

export const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema)

export const couponValidationSchema = z.object({
  code: z.string().min(3, "Coupon code must be at least 3 characters"),
  discountPercentage: z.number().min(1).max(100, "Discount must be between 1 and 100"),
  expiresAt: z.date(),
  course: z.string().optional(),
})

export type CouponType = z.infer<typeof couponValidationSchema>
