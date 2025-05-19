import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Define auth pages to prevent redirect loops
  const authPages = [
    "/signin",
    "/signup",
    "/role",
    "/admin/signin",
    "/admin/signup",
    "/teacher/signin",
    "/teacher/signup",
    "/student/signin",
    "/student/signup",
  ]

  // Check if current path is an auth page
  const isAuthPage = authPages.some((page) => pathname === page)

  // Get the token and user information
  const token = await getToken({ req: request })
  const userRole = token?.role
  const isAuthenticated = !!token

  // Skip auth checks for auth pages to prevent redirect loops
  if (!isAuthPage) {
    // Admin routes protection
    if (pathname.startsWith("/admin") && userRole !== "admin") {
      return NextResponse.redirect(new URL("/admin/signin", request.url))
    }

    // Teacher routes protection
    if (pathname.startsWith("/teacher") && userRole !== "teacher") {
      return NextResponse.redirect(new URL("/teacher/signin", request.url))
    }

    // Student routes protection
    if (pathname.startsWith("/student") && userRole !== "student") {
      return NextResponse.redirect(new URL("/student/signin", request.url))
    }

    // Dashboard access protection
    if (pathname === "/dashboard" && !isAuthenticated) {
      return NextResponse.redirect(new URL("/signin", request.url))
    }

    // Course learning protection
    if (pathname.includes("/courses/") && pathname.includes("/learn/") && !isAuthenticated) {
      return NextResponse.redirect(new URL("/signin", request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthPage) {
    switch (userRole) {
      case "admin":
        return NextResponse.redirect(new URL("/admin/dashboard", request.url))
      case "teacher":
        return NextResponse.redirect(new URL("/teacher/dashboard", request.url))
      case "student":
        return NextResponse.redirect(new URL("/dashboard", request.url))
      default:
        return NextResponse.redirect(new URL("/", request.url))
    }
  }

  // Check if an admin already exists when trying to access admin signup
  if (pathname === "/admin/signup") {
    try {
      const response = await fetch(new URL("/api/auth/admin-exists", request.url).toString())
      const { exists } = await response.json()

      if (exists) {
        return NextResponse.redirect(new URL("/admin/signin", request.url))
      }
    } catch (error) {
      console.error("Error checking if admin exists:", error)
    }
  }

  return NextResponse.next()
}

// Configure the paths that should be checked by the middleware
export const config = {
  matcher: [
    // Include all paths that need protection
    "/admin/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/dashboard",
    "/courses/:path*/learn/:path*",

    // Include auth pages for redirecting authenticated users
    "/signin",
    "/signup",
    "/role",
    "/admin/signin",
    "/admin/signup",
    "/teacher/signin",
    "/teacher/signup",
    "/student/signin",
    "/student/signup",
  ],
}
