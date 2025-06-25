import mongoose from "mongoose"
import { z } from "zod"

const reviewSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now },
})

export const Review = mongoose.models?.Review ? mongoose.models.Review : mongoose.model("Review", reviewSchema)

export const reviewValidationSchema = z.object({
  course: z.string(),
  student: z.string(),
  rating: z.number().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().optional(),
})

export type ReviewType = z.infer<typeof reviewValidationSchema>
