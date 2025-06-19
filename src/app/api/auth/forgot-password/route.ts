import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { z } from "zod"
import { dbConnect } from "@/lib/dbConnect"
import { Student } from "@/models/student"
import { Teacher } from "@/models/teacher"
import { Admin } from "@/models/admin"
import { sendPasswordResetEmail } from "@/lib/email"

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["student", "teacher", "admin"], {
    required_error: "Role is required",
  }),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const validatedData = forgotPasswordSchema.safeParse(body)
    if (!validatedData.success) {
      return NextResponse.json({ error: validatedData.error.errors[0].message }, { status: 400 })
    }

    const { email, role } = validatedData.data

    await dbConnect()

    // Find user based on role
    let user: typeof Student | typeof Teacher | typeof Admin | null
    switch (role) {
      case "student":
        user = await Student.findOne({ email })
        break
      case "teacher":
        user = await Teacher.findOne({ email })
        break
      case "admin":
        user = await Admin.findOne({ email })
        break
      default:
        return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Don't reveal if user exists or not for security
    if (!user) {
      return NextResponse.json(
        { message: "If an account exists with that email, a password reset link has been sent." },
        { status: 200 },
      )
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")

    // Hash token before storing in database
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")

    // Set token and expiry (1 hour)
    user.resetToken = hashedToken
    user.resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour

    await user.save()

    // Send email with reset link using Resend
    await sendPasswordResetEmail(email, resetToken, role)

    return NextResponse.json(
      { message: "If an account exists with that email, a password reset link has been sent." },
      { status: 200 },
    )
  } catch (error) {
    console.error("Password reset error:", error)
    return NextResponse.json({ error: "Failed to process password reset request" }, { status: 500 })
  }
}
