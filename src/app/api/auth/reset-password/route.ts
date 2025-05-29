import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { dbConnect } from "@/lib/dbConnect"
import { Student, studentPasswordResetSchema } from "@/models/student"
import { Teacher, teacherPasswordResetSchema } from "@/models/teacher"
import { Admin, adminPasswordResetSchema } from "@/models/admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password, confirmPassword, role } = body

    if (!token || !password || !confirmPassword || !role) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Validate based on role
    let validationSchema
    let userModel

    switch (role) {
      case "student":
        validationSchema = studentPasswordResetSchema
        userModel = Student
        break
      case "teacher":
        validationSchema = teacherPasswordResetSchema
        userModel = Teacher
        break
      case "admin":
        validationSchema = adminPasswordResetSchema
        userModel = Admin
        break
      default:
        return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Validate input
    const validation = validationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 })
    }

    await dbConnect()

    // Find user with valid reset token
    const user = await userModel.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update user password and clear reset token
    user.password = hashedPassword
    user.resetToken = null
    user.resetTokenExpiry = null
    user.loginAttempts = 0
    user.lockUntil = undefined
    await user.save()

    return NextResponse.json({ message: "Password reset successfully" }, { status: 200 })
  } catch (error) {
    console.error("Password reset error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
