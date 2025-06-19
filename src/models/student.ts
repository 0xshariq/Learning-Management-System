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

// Define the student schema with all necessary fields
const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    progress: [{ type: mongoose.Schema.Types.ObjectId, ref: "CourseProgress" }],
    certificates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Certificate" }],

    // Authentication fields
    isBlocked: { type: Boolean, default: false },

    // Security fields
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLogin: { type: Date, default: null },


    // Password reset fields
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },

    // Profile fields
    bio: { type: String, default: "" },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    profileImage: { type: String, default: "" },
  },
  { timestamps: true },
)

// Add virtual for isLocked
studentSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil.getTime() > Date.now())
})

// Create the Student model
export const Student = mongoose.models?.Student ? mongoose.models.Student : mongoose.model("Student", studentSchema)

// Zod validation schema
export const studentValidationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: passwordValidation,
})

// Password reset validation schema
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
