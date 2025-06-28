import mongoose from "mongoose";
import { z } from "zod";
// RequestRefund Schema – student requests, teacher reviews & accepts/rejects
const requestRefund = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  amount: { type: Number, required: true },
  reason: { type: String },
  notes: { type: String },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" }, // only teacher handles
  requestedAt: { type: Date, default: Date.now },
  attachments: [{ type: String }],
  refundReasonCategory: { type: String, enum: ["duplicate", "not_as_described", "other"], default: "other" },
  requestStatus: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
}, { timestamps: true });

export const requestRefundSchema = z.object({
  courseId: z.string(),
  studentId: z.string(),
  amount: z.number().min(0),
  reason: z.string().optional(),
  notes: z.string().optional(),
  processedBy: z.string().optional(),
  requestedAt: z.date().optional(),
  attachments: z.array(z.string()).optional(),
  refundReasonCategory: z.enum(["duplicate", "not_as_described", "other"]).optional(),
  requestStatus: z.enum(["pending", "accepted", "rejected"]).default("pending"),
});

export type RequestRefundType = z.infer<typeof requestRefundSchema>;
export const RequestRefund = mongoose.models?.RequestRefund ? mongoose.models.RequestRefund : mongoose.model("RequestRefund", requestRefund);
