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

// Define the student schema - UNCHANGED
const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    progress: [{ type: mongoose.Schema.Types.ObjectId, ref: "CourseProgress" }],
    certificates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Certificate" }],
  },
  { timestamps: true },
)

// Create the Student model - UNCHANGED
export const Student = mongoose.models?.Student ? mongoose.models.Student : mongoose.model("Student", studentSchema)

// Zod validation schema - ONLY ENHANCED PASSWORD VALIDATION
export const studentValidationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: passwordValidation,
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

export type StudentType = z.infer<typeof studentValidationSchema>
