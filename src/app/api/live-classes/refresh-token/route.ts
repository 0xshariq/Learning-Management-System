import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { zenStreamService } from "@/lib/zenstream"
import { rateLimit } from "@/lib/utils"

// Rate limiting configuration
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 50,
})

interface RefreshTokenRequest {
  token: string
  streamId?: string
}

interface RefreshTokenResponse {
  token: string
  expiresIn: number
  expiresAt: Date
  permissions: string[]
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         request.ip || 
         'unknown'
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIP(request)
    const { success } = await limiter.limit(ip)
    if (!success) {
      return NextResponse.json({ error: "Too many token refresh requests" }, { status: 429 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const body: RefreshTokenRequest = await request.json()
    const { token, streamId } = body

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    // Verify the current token
    const decoded = zenStreamService.verifyJWTToken(token, { checkExpiry: false })
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Validate user access
    if (decoded.userId !== session.user.id) {
      return NextResponse.json({ error: "Token does not belong to current user" }, { status: 403 })
    }

    // If streamId is provided, validate it matches the token
    if (streamId && decoded.streamId !== streamId) {
      return NextResponse.json({ error: "Stream ID mismatch" }, { status: 400 })
    }

    // Check if session is still active
    if (!zenStreamService.isSessionActive(decoded.streamId, decoded.sessionId)) {
      return NextResponse.json({ error: "Session has been terminated" }, { status: 401 })
    }

    // Refresh the token with enhanced security
    const refreshedToken = zenStreamService.refreshJWTToken(token, {
      extendBy: 4 * 60 * 60, // 4 hours
      validateSession: true
    })

    if (!refreshedToken) {
      return NextResponse.json({ error: "Failed to refresh token" }, { status: 500 })
    }

    // Get new token expiry
    const newExpiryTime = zenStreamService.getTokenExpiryTime(refreshedToken)
    const expiresIn = newExpiryTime ? Math.floor((newExpiryTime.getTime() - Date.now()) / 1000) : 4 * 60 * 60

    // Decode the new token to get permissions
    const newDecoded = zenStreamService.verifyJWTToken(refreshedToken, { checkExpiry: false })

    const response: RefreshTokenResponse = {
      token: refreshedToken,
      expiresIn,
      expiresAt: newExpiryTime || new Date(Date.now() + (4 * 60 * 60 * 1000)),
      permissions: newDecoded?.permissions || []
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("Error refreshing token:", error)
    
    if (error instanceof Error) {
      if (error.message.includes("Invalid token")) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      
      if (error.message.includes("Session")) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET endpoint to check token status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    // Verify the token
    const decoded = zenStreamService.verifyJWTToken(token)
    
    if (!decoded) {
      return NextResponse.json({ 
        valid: false, 
        reason: "Invalid or expired token" 
      })
    }

    // Check if session is active
    const isActive = zenStreamService.isSessionActive(decoded.streamId, decoded.sessionId)
    
    // Get time remaining
    const timeRemaining = zenStreamService.getTokenTimeRemaining(token)

    return NextResponse.json({
      valid: true,
      isActive,
      timeRemaining,
      expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null,
      permissions: decoded.permissions,
      role: decoded.role
    })

  } catch (error) {
    console.error("Error checking token status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
