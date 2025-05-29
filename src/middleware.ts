import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files, API routes, and Next.js internals
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next()
  }

  // Define public routes that don't need authentication
  const publicRoutes = ["/", "/about", "/courses", "/role"]

  // Define auth pages
  const authPages = [
    "/signin",
    "/signup",
    "/admin/signin",
    "/admin/signup",
    "/teacher/signin",
    "/teacher/signup",
    "/student/signin",
    "/student/signup",
    "/forgot-password",
    "/reset-password",
  ]

  // Check if current path is public or auth page
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith("/courses/")
  const isAuthPage = authPages.includes(pathname)

  try {
    // Get token with proper configuration
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    })

    const userRole = token?.role as string | undefined
    const isAuthenticated = !!token

    // Debug logging (remove in production)
    if (process.env.NODE_ENV === "development") {
      console.log("Middleware Debug:", {
        pathname,
        isAuthenticated,
        userRole,
        tokenExists: !!token,
      })
    }

    // Handle generic dashboard redirect for authenticated users
    if (pathname === "/dashboard" && isAuthenticated && userRole) {
      const dashboardUrl = `/${userRole}/dashboard`
      return NextResponse.redirect(new URL(dashboardUrl, request.url))
    }

    // Handle generic dashboard redirect for unauthenticated users
    if (pathname === "/dashboard" && !isAuthenticated) {
      return NextResponse.redirect(new URL("/role", request.url))
    }

    // Handle public routes - allow access
    if (isPublicRoute && !isAuthPage) {
      return NextResponse.next()
    }

    // Handle authenticated users trying to access auth pages - redirect to dashboard
    if (isAuthenticated && isAuthPage) {
      if (userRole) {
        const dashboardUrl = `/${userRole}/dashboard`
        return NextResponse.redirect(new URL(dashboardUrl, request.url))
      }
      // If authenticated but no role, redirect to role selection
      return NextResponse.redirect(new URL("/role", request.url))
    }

    // Handle unauthenticated users trying to access protected routes
    if (!isAuthenticated && !isAuthPage && !isPublicRoute) {
      // Determine which signin page to redirect to based on the route
      let signinUrl = "/role"

      if (pathname.startsWith("/admin")) {
        signinUrl = "/admin/signin"
      } else if (pathname.startsWith("/teacher")) {
        signinUrl = "/teacher/signin"
      } else if (pathname.startsWith("/student")) {
        signinUrl = "/student/signin"
      }

      return NextResponse.redirect(new URL(signinUrl, request.url))
    }

    // Handle role-based route protection for authenticated users
    if (isAuthenticated && !isAuthPage && !isPublicRoute) {
      // If user is authenticated but has no role, redirect to role selection
      if (!userRole) {
        return NextResponse.redirect(new URL("/role", request.url))
      }

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
    }

    // Handle admin signup protection (only allow if no admin exists)
    if (pathname === "/admin/signup") {
      try {
        const adminExistsUrl = new URL("/api/auth/admin-exists", request.url)
        const response = await fetch(adminExistsUrl.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const { exists } = await response.json()
          if (exists) {
            return NextResponse.redirect(new URL("/admin/signin", request.url))
          }
        }
      } catch (error) {
        console.error("Error checking admin exists:", error)
        // Continue to allow access if check fails
      }
    }

    return NextResponse.next()
  } catch (error) {
    console.error("Middleware error:", error)
    // If there's an error getting the token, allow the request to continue
    // This prevents the middleware from breaking the entire app
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
}
