import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/dbConnect"
import { Student } from "@/models/student"
import { Teacher } from "@/models/teacher"
import { Admin } from "@/models/admin"

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const { token, role } = await request.json()

    if (!token || !role) {
      return NextResponse.json({ error: "Token and role are required" }, { status: 400 })
    }

    let userModel: typeof Student | typeof Teacher | typeof Admin
    switch (role) {
      case "student":
        userModel = Student
        break
      case "teacher":
        userModel = Teacher
        break
      case "admin":
        userModel = Admin
        break
      default:
        return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Find user with verification token
    const user = await userModel.findOne({
      emailVerificationToken: token,
      emailVerificationExpiry: { $gt: new Date() },
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired verification token" }, { status: 400 })
    }

    // Update user as verified
    user.emailVerified = true
    user.emailVerificationToken = undefined
    user.emailVerificationExpiry = undefined
    await user.save()

    return NextResponse.json({
      message: "Email verified successfully! You can now sign in.",
    })
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
