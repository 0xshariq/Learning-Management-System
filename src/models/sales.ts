import mongoose from "mongoose";
import { z } from "zod";

const sales = new mongoose.Schema({
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
    amount: { type: Number, required: true },
    saleTime: { type: Date, required: true }, // Time when the sale was made
    expiryTime: { type: Date }, // Optional: when access to the course expires
    platform: { type: String }, // e.g., "web", "mobile"
    currency: { type: String, default: "INR" },
    notes: { type: String }, // Any additional notes
}, { timestamps: true });

export const salesSchema = z.object({
    teacher: z.string(),
    course: z.string(),
    payment: z.string(),
    amount: z.number().min(0, "Amount must be a positive number"),
    saleTime: z.date(),
    expiryTime: z.date().optional(),
    platform: z.string().optional(),
    currency: z.string().default("INR").optional(),
    notes: z.string().optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

export type SaleType = z.infer<typeof salesSchema>;
export const Sale = mongoose.models?.Sale ? mongoose.models.Sale : mongoose.model("Sale", sales);