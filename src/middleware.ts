import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { redirect } from "next/navigation"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files, API routes, and Next.js internals
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.includes(".") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next()
  }

  // Define public routes that don't need authentication
  const publicRoutes = ["/", "/about", "/courses", "/role", "/contact", "/privacy", "/terms", "/test-session"]

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
    const isBlocked = token?.isBlocked as boolean

    // Debug logging (remove in production)
    if (process.env.NODE_ENV === "development") {
      console.log("Middleware Debug:", {
        pathname,
        isAuthenticated,
        userRole,
        isBlocked,
        tokenExists: !!token,
      })
    }

    // If authenticated user tries to access /role, redirect to their dashboard
    if (pathname === "/role" && isAuthenticated && userRole) {
      return NextResponse.redirect(new URL(`/${userRole}/dashboard`, request.url));
    }

    // Check if user is blocked
    if (isAuthenticated && isBlocked && !isAuthPage) {
      return NextResponse.redirect(new URL("/role?error=blocked", request.url))
    }

    // Allow access to /dashboard for authenticated users (redirect to role dashboard)
    if (pathname === "/dashboard") {
      if (!isAuthenticated) {
        return NextResponse.redirect(new URL("/role", request.url))
      }
      if (userRole) {
        return NextResponse.redirect(new URL(`/${userRole}/dashboard`, request.url))
      }
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
      } else {
        return NextResponse.redirect(new URL("/role", request.url))
      }
    }

    // Handle unauthenticated users trying to access protected routes
    if (!isAuthenticated && !isAuthPage && !isPublicRoute) {
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
      if (pathname.startsWith("/admin") && userRole !== "admin") {
        return NextResponse.redirect(new URL("/role?error=unauthorized", request.url))
      }
      if (pathname.startsWith("/teacher") && userRole !== "teacher") {
        return NextResponse.redirect(new URL("/role?error=unauthorized", request.url))
      }
      if (pathname.startsWith("/student") && userRole !== "student") {
        return NextResponse.redirect(new URL("/role?error=unauthorized", request.url))
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
          redirect("/admin/dashboard")
        }
      } catch (error) {
        console.error("Error checking admin exists:", error)
        // Continue to allow access if check fails
      }
    }

    return NextResponse.next()
  } catch (error) {
    console.error("Middleware error:", error)
    if (!isPublicRoute && !isAuthPage) {
      return NextResponse.redirect(new URL("/role", request.url))
    }
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
}