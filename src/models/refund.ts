import mongoose from "mongoose";
import { z } from "zod";

const refund = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true }, // Student requesting refund
  razorpayPaymentId: { type : mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
  razorpayOrderId: { type : mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
  amount: { type: Number, required: true },
  reason: { type: String },
  refundReasonCategory: { type: String, enum: ["duplicate", "not_as_described", "other"], default: "other" },
  status: { type: String, enum: ["pending", "processed", "failed"], default: "pending" },
  refundId: { type: String },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" }, // Teacher who processed
  notes: { type: String },
  refundMethod: { type: String, enum: ["original", "manual", "wallet"], default: "original" },
  requestedAt: { type: Date, default: Date.now },
  refundedAt: { type: Date },
  isAutoProcessed: { type: Boolean, default: false },
  attachments: [{ type: String }],
}, { timestamps: true });

export const refundSchema = z.object({
  course: z.string(),
  student: z.string(),
  razorpayPaymentId: z.string(),
  razorpayOrderId: z.string(),
  amount: z.number().min(0, "Amount must be a positive number"),
  reason: z.string().optional(),
  refundReasonCategory: z.enum(["duplicate", "not_as_described", "other"]).default("other").optional(),
  status: z.enum(["pending", "processed", "failed"]).default("pending"),
  refundId: z.string().optional(),
  processedBy: z.string().optional(),
  notes: z.string().optional(),
  refundMethod: z.enum(["original", "manual", "wallet"]).default("original").optional(),
  requestedAt: z.date().optional(),
  refundedAt: z.date().optional(),
  isAutoProcessed: z.boolean().optional(),
  attachments: z.array(z.string()).optional(),
});

export type RefundType = z.infer<typeof refundSchema>;
export const Refund = mongoose.models?.Refund ? mongoose.models.Refund : mongoose.model("Refund", refund);