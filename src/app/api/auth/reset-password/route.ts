import { NextResponse } from "next/server"
import crypto from "node:crypto"
import bcrypt from "bcryptjs"
import { dbConnect } from "@/lib/dbConnect"
import { Student, passwordResetSchema as studentResetSchema } from "@/models/student"
import { Teacher, passwordResetSchema as teacherResetSchema } from "@/models/teacher"
import { Admin, adminPasswordResetSchema } from "@/models/admin"
import type { ZodType } from "zod"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token, password, confirmPassword, role } = body

    if (!token || !password || !confirmPassword || !role) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    let validationSchema: ZodType<{ password: string; confirmPassword: string }>
    let userModel: typeof Student | typeof Teacher | typeof Admin

    switch (role) {
      case "student":
        validationSchema = studentResetSchema
        userModel = Student
        break
      case "teacher":
        validationSchema = teacherResetSchema
        userModel = Teacher
        break
      case "admin":
        validationSchema = adminPasswordResetSchema
        userModel = Admin
        break
      default:
        return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Validate input using imported schema
    const validation = validationSchema.safeParse({ password, confirmPassword })
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 })
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

    await dbConnect()

    // Find user with valid token
    const user = await userModel.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() },
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update user password and clear reset token
    user.password = hashedPassword
    user.resetToken = undefined
    user.resetTokenExpiry = undefined

    await user.save()

    return NextResponse.json({ message: "Password reset successfully" }, { status: 200 })
  } catch (error) {
    console.error("Password reset error:", error)
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
  }
}
