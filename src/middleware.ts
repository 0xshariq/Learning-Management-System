import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/contact",
    "/privacy",
    "/terms",
    "/faq",
    "/help",
    "/signin",
    "/signup",
    "/role",
    "/courses",
    "/courses/all",
  ]

  // Check if the current path is a public route or starts with certain prefixes
  const isPublicRoute =
    publicRoutes.some((route) => pathname === route) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/fonts")

  // Admin routes protection
  if (pathname.startsWith("/admin") && pathname !== "/admin/signin") {
    // Special case for admin signup
    if (pathname === "/admin/signup") {
      try {
        const response = await fetch(`${request.nextUrl.origin}/api/auth/admin-exists`)
        const data = await response.json()

        // If an admin exists, redirect to the admin signin page
        if (data.exists) {
          return NextResponse.redirect(new URL("/admin/signin", request.url))
        }

        // If no admin exists, allow access to signup
        return NextResponse.next()
      } catch (error) {
        console.error("Error checking admin existence:", error)
        // If there's an error, allow access to the signup page
        return NextResponse.next()
      }
    }

    // For all other admin routes, check if user is admin
    if (!token || token.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/signin", request.url))
    }
  }

  // Teacher routes protection
  if (pathname.startsWith("/teacher") && pathname !== "/teacher/signin" && pathname !== "/teacher/signup") {
    if (!token || token.role !== "teacher") {
      return NextResponse.redirect(new URL("/teacher/signin", request.url))
    }
  }

  // Student routes protection
  if (pathname.startsWith("/student") && pathname !== "/student/signin" && pathname !== "/student/signup") {
    if (!token || token.role !== "student") {
      return NextResponse.redirect(new URL("/student/signin", request.url))
    }
  }

  // Dashboard protection
  if (pathname === "/dashboard") {
    if (!token) {
      return NextResponse.redirect(new URL("/signin", request.url))
    }
  }

  // Course learning pages protection
  if (pathname.includes("/courses/") && pathname.includes("/learn/")) {
    if (!token) {
      return NextResponse.redirect(new URL(`/signin?callbackUrl=${encodeURIComponent(pathname)}`, request.url))
    }

    // Additional check for course access will be handled in the page component
    // as it requires database queries to check if the user has purchased the course
  }

  // Redirect authenticated users away from auth pages
  if ((pathname.includes("/signin") || pathname.includes("/signup")) && token) {
    // Redirect based on role
    if (token.role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url))
    }
    if (token.role === "teacher") {
      return NextResponse.redirect(new URL("/teacher/dashboard", request.url))
    }
    if (token.role === "student") {
      return NextResponse.redirect(new URL("/student/dashboard", request.url))
    }
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

// Run middleware on all routes
// Exclude API routes except for those we want to protect
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * But include:
     * - API routes we want to protect
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
    "/api/courses/:path*",
    "/api/users/:path*",
    "/api/payments/:path*",
  ],
}
