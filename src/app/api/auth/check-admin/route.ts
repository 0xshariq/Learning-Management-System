import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { dbConnect } from "@/lib/dbConnect"
import { Admin } from "@/models/admin"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ isAdmin: false }, { status: 401 })
    }

    await dbConnect()

    // Check if the user is an admin
    const admin = await Admin.findOne({ email: session.user.email })

    return NextResponse.json({ isAdmin: !!admin }, { status: 200 })
  } catch (error) {
    console.error("Error checking admin status:", error)
    return NextResponse.json({ isAdmin: false, error: "Failed to check admin status" }, { status: 500 })
  }
}
