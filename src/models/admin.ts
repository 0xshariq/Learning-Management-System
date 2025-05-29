import mongoose from "mongoose"
import { z } from "zod"

// Password strength validation
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character")

// Define the admin schema
const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    twoFactorSecret: { type: String, default: null },
    twoFactorEnabled: { type: Boolean, default: false },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
    lastLogin: { type: Date, default: null },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
  },
  { timestamps: true },
)

// Virtual for checking if account is locked
adminSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil.getTime() > Date.now())
})

// Create the Admin model
export const Admin = mongoose.models?.Admin ? mongoose.models.Admin : mongoose.model("Admin", adminSchema)

// Zod validation schema
export const adminValidationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
})

// Password reset schema
export const adminPasswordResetSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

// 2FA setup schema
export const admin2FASchema = z.object({
  token: z.string().length(6, "2FA token must be 6 digits"),
})

export type AdminType = z.infer<typeof adminValidationSchema>
export type AdminPasswordResetType = z.infer<typeof adminPasswordResetSchema>
export type Admin2FAType = z.infer<typeof admin2FASchema>
