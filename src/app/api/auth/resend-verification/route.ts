import { type NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import { dbConnect } from "@/lib/dbConnect"
import { Student } from "@/models/student"
import { Teacher } from "@/models/teacher"
import { Admin } from "@/models/admin"
import { sendVerificationEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const { email, role } = await request.json()

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 })
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

    const user = await userModel.findOne({ email })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 })
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex")
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    user.emailVerificationToken = verificationToken
    user.emailVerificationExpiry = verificationExpiry
    await user.save()

    // Send verification email
    await sendVerificationEmail(email, verificationToken, role)

    return NextResponse.json({
      message: "Verification email sent successfully",
    })
  } catch (error) {
    console.error("Resend verification error:", error)
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 })
  }
}
