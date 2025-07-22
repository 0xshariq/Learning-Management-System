import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { verifyJWTToken, generateJWTToken } from "@/lib/zenstream"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    // Verify the current token
    const decoded = verifyJWTToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Check if the user is authorized for this token
    if (decoded.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized for this token" }, { status: 403 })
    }

    // Generate a new token with extended expiration
    const newToken = generateJWTToken(decoded.streamId, decoded.userId, decoded.role)

    return NextResponse.json({
      token: newToken,
      expiresIn: 4 * 60 * 60, // 4 hours in seconds
      message: "Token refreshed successfully"
    })

  } catch (error) {
    console.error("Error refreshing token:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
