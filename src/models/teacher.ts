import mongoose from "mongoose"
import { z } from "zod"

// Enhanced password validation schema
const passwordValidation = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character")

// Define the teacher schema - UNCHANGED
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

// Create the Teacher model - UNCHANGED
export const Teacher = mongoose.models?.Teacher ? mongoose.models.Teacher : mongoose.model("Teacher", teacherSchema)

// Zod validation schema - ONLY ENHANCED PASSWORD VALIDATION
export const teacherValidationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: passwordValidation,
  upiId: z.string().min(1, "UPI ID is required"),
  age: z.number().optional(),
})

// Password reset validation schema - SEPARATE FROM MODEL
export const passwordResetSchema = z
  .object({
    password: passwordValidation,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

export type TeacherType = z.infer<typeof teacherValidationSchema>
