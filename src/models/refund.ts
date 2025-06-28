import mongoose from "mongoose";
import { z } from "zod";

// Refund Schema – executed refund after teacher approval
const refund = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  razorpayPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
  amount: { type: Number, required: true },
  refundId: { type: String },
  status: { type: String, enum: ["pending", "processed", "failed"], default: "pending" },
  refundedAt: { type: Date },
  refundMethod: { type: String, enum: ["original", "manual", "wallet"], default: "original" },
  isAutoProcessed: { type: Boolean, default: false },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" }, // only teacher
}, { timestamps: true });

export const refundSchema = z.object({
  courseId: z.string(),
  studentId: z.string(),
  razorpayPaymentId: z.string(),
  amount: z.number().min(0),
  refundId: z.string().optional(),
  status: z.enum(["pending", "processed", "failed"]).default("pending"),
  refundedAt: z.date().optional(),
  refundMethod: z.enum(["original", "manual", "wallet"]).optional(),
  isAutoProcessed: z.boolean().optional(),
  processedBy: z.string().optional(),
});

export type RefundType = z.infer<typeof refundSchema>;
export const Refund = mongoose.models?.Refund ? mongoose.models.Refund : mongoose.model("Refund", refund);