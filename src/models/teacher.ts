import mongoose from "mongoose"
import { z } from "zod"

// Define the teacher schema
const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    upiId: { type: String, required: true },
    age: { type: Number },
    coursesCreated: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    totalEarnings: { type: Number, default: 0 },
    ratings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    averageRating: { type: Number, default: 0 },
  },
  { timestamps: true },
)

// Create the Teacher model - Fix the model definition to prevent errors
export const Teacher =
  mongoose.models?.Teacher ? mongoose.models.Teacher : mongoose.model("Teacher", teacherSchema)

// Zod validation schema
export const teacherValidationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  upiId: z.string().min(1, "UPI ID is required"),
  age: z.number().optional(),
})

export type TeacherType = z.infer<typeof teacherValidationSchema>
