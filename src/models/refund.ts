import mongoose from "mongoose";
import { z } from "zod";

const refund = new mongoose.Schema({
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    razorpayPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
    razorpayOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
    amount: { type: Number, required: true },
    reason: { type: String },
    status: { type: String, enum: ["pending", "processed", "failed"], default: "pending" },
    refundId: { type: String },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
    refundMethod: { type: String, enum: ["original", "manual", "wallet"], default: "original" },
    refundedAt: { type: Date },
}, { timestamps: true });

export const refundSchema = z.object({
    course: z.string(),
    razorpayPaymentId: z.string(),
    razorpayOrderId: z.string(),
    amount: z.number().min(0, "Amount must be a positive number"),
    reason: z.string().optional(),
    status: z.enum(["pending", "processed", "failed"]).default("pending"),
    refundId: z.string().optional(),
    processedBy: z.string().optional(),
    notes: z.string().optional(),
    refundMethod: z.enum(["original", "manual", "wallet"]).default("original").optional(),
    refundedAt: z.date().optional()
});

export type RefundType = z.infer<typeof refundSchema>;
export const Refund = mongoose.models?.Refund ? mongoose.models.Refund : mongoose.model("Refund", refund);