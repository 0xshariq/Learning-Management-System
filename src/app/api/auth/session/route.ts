import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ session: null }, { status: 200 })
    }

    // Debug log to verify session data
    console.log("Session API - Current session:", {
      id: session.user.id,
      role: session.user.role,
      email: session.user.email,
      isAdmin: session.user.isAdmin,
      isBlocked: session.user.isBlocked,
      isEmailVerified: session.user.isEmailVerified,
    })

    return NextResponse.json(
      {
        session: {
          user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            role: session.user.role,
            isAdmin: session.user.isAdmin,
            isBlocked: session.user.isBlocked,
            isEmailVerified: session.user.isEmailVerified,
            image: session.user.image,
          },
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Session API error:", error)
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 })
  }
}
