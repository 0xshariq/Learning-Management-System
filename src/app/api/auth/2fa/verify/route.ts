import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import speakeasy from "speakeasy"
import { dbConnect } from "@/lib/dbConnect"
import { Student } from "@/models/student"
import { Teacher } from "@/models/teacher"
import { Admin } from "@/models/admin"
import { authOptions } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { token } = await request.json()

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!token || token.length !== 6) {
      return NextResponse.json({ error: "Invalid token format" }, { status: 400 })
    }

    await dbConnect()

    let userModel: typeof Student | typeof Teacher | typeof Admin
    switch (session.user.role) {
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

    const user = await userModel.findById(session.user.id)

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json({ error: "2FA not set up" }, { status: 400 })
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token,
      window: 2,
    })

    if (!verified) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 })
    }

    // Enable 2FA
    user.twoFactorEnabled = true
    await user.save()

    return NextResponse.json({
      message: "2FA enabled successfully",
    })
  } catch (error) {
    console.error("2FA verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
