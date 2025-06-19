import mongoose from "mongoose";

import { z } from "zod";
const coupon = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discountPercentage: { type: Number }, // Optional
  discountAmount: { type: Number },     // Optional
  expiresAt: { type: Date, required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" }
}, {
  timestamps: true,
});

export const couponSchema = z.object({
  code: z.string().min(1).max(50),
  discountPercentage: z.number().optional(),
  discountAmount: z.number().optional(),
  expiresAt: z.string().or(z.date()),
  course: z.string().min(1),
});
export const Coupon = mongoose.models?.Coupon
  ? mongoose.models.Coupon
  : mongoose.model("Coupon", coupon);