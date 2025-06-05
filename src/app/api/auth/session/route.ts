import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    // Fallback: use email prefix or role if name is missing
    const userName =
      session.user.name ||
      (session.user.email ? session.user.email.split("@")[0] : undefined) ||
      session.user.role?.toUpperCase() ||
      "User"
    
    return NextResponse.json(
      {
        user: {
          id: session.user.id,
          name: userName,
          email: session.user.email,
          role: session.user.role,
          isAdmin: session.user.isAdmin,
          isBlocked: session.user.isBlocked,
          image: session.user.image,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Session API error:", error)
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 })
  }
}