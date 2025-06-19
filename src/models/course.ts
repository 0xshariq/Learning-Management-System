import mongoose from "mongoose"
import { z } from "zod"

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 5 },
  description: { type: String, required: true, minlength: 100 },
  syllabus: { type: String, required: true, minlength: 50 },
  price: { type: Number, required: true, default: 0 },
  duration: { type: String, required: true, minlength: 2 },
  category: { type: String, required: true },
  level: { type: String, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  studentsPurchased: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  imageUrl: { type: String },
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: false },
  isPublished: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

export const Course =  mongoose.models?.Course ? mongoose.models.Course : mongoose.model("Course", courseSchema)

export const courseValidationSchema = z.object({
  name: z.string().min(5, "Course name must be at least 5 characters"),
  description: z.string().min(100, "Description must be at least 100 characters"),
  syllabus: z.string().min(50, "Syllabus must be at least 50 characters"),
  price: z.number().min(0, "Price cannot be negative"),
  duration: z.string().min(2, "Duration must be specified"),
  category: z.string().min(1, "Category is required"),
  level: z.string().min(1, "Difficulty level is required"),
  teacher: z.string(),
  imageUrl: z.string().url("Invalid image URL").optional(),
  isPublished: z.boolean().default(false),
})

export type CourseType = z.infer<typeof courseValidationSchema>
