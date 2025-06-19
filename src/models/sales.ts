import mongoose from "mongoose";
import { z } from "zod";

const sales = new mongoose.Schema({
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    amount: { type: Number, required: true },
    saleTime: { type: Date, required: true },
    expiryTime: { type: Date , required: true},
    platform: { type: String },
    currency: { type: String, default: "INR" },
    notes: { type: String },
}, { timestamps: true });

export const salesSchema = z.object({
    teacher: z.string(), // Expect string ID from client
    course: z.string(),  // Expect string ID from client
    amount: z.number().min(0, "Amount must be a positive number"),
    saleTime: z.union([z.string(), z.date()]), // Accept string or Date
    expiryTime: z.union([z.string(), z.date()]),
    platform: z.string().optional(),
    currency: z.string().default("INR").optional(),
    notes: z.string().optional(),
    createdAt: z.union([z.string(), z.date()]).optional(),
    updatedAt: z.union([z.string(), z.date()]).optional(),
});

export type SaleType = z.infer<typeof salesSchema>;
export const Sale = mongoose.models?.Sale ? mongoose.models.Sale : mongoose.model("Sale", sales);