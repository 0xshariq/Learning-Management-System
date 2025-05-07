import mongoose from "mongoose"
import { z } from "zod"

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true, minlength: 100 },
  syllabus: { type: String }, // Optional
  price: { type: Number, required: true, default: 0 },
  duration: { type: String, required: true }, // example: "2 months", "10 hours"
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  studentsPurchased: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  imageUrl: { type: String }, // Course thumbnail
  isPublished: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

export const Course = mongoose.models.Course || mongoose.model("Course", courseSchema)

export const courseValidationSchema = z.object({
  name: z.string().min(3, "Course name must be at least 3 characters"),
  description: z.string().min(100, "Description must be at least 100 characters"),
  syllabus: z.string().optional(),
  price: z.number().min(0, "Price cannot be negative"),
  duration: z.string().min(2, "Duration must be specified"),
  teacher: z.string(),
  imageUrl: z.string().url("Invalid image URL").optional(),
  isPublished: z.boolean().default(false),
})

export type CourseType = z.infer<typeof courseValidationSchema>
