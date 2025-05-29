import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import speakeasy from "speakeasy"
import QRCode from "qrcode"
import { dbConnect } from "@/lib/dbConnect"
import { Student } from "@/models/student"
import { Teacher } from "@/models/teacher"
import { Admin } from "@/models/admin"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    let userModel
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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `EduLearn (${user.email})`,
      issuer: "EduLearn",
      length: 32,
    })

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)

    // Save secret to user (but don't enable 2FA yet)
    user.twoFactorSecret = secret.base32
    await user.save()

    return NextResponse.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
    })
  } catch (error) {
    console.error("2FA setup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
