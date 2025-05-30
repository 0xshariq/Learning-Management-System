import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import speakeasy from "speakeasy"
import { dbConnect } from "@/lib/dbConnect"
import { Student } from "@/models/student"
import { Teacher } from "@/models/teacher"
import { Admin } from "@/models/admin"

const MAX_LOGIN_ATTEMPTS = 5
const LOCK_TIME = 2 * 60 * 60 * 1000 // 2 hours

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
        twoFactorToken: { label: "2FA Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.role) {
          throw new Error("Missing credentials")
        }

        await dbConnect()

        try {
          let user = null
          let userModel = null

          // Determine which model to use based on role
          switch (credentials.role) {
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
              throw new Error("Invalid role")
          }

          // Find user by email
          user = await userModel.findOne({ email: credentials.email })

          if (!user) {
            throw new Error("No user found with this email")
          }

          // Check if account is locked
          if (user.isLocked) {
            throw new Error("Account is temporarily locked due to too many failed login attempts")
          }

          // Check if user is blocked (for students and teachers)
          if (credentials.role !== "admin" && user.isBlocked) {
            throw new Error("Your account has been blocked. Please contact support.")
          }

          // Check if email is verified (for students and teachers)
          if (credentials.role !== "admin" && !user.isEmailVerified) {
            throw new Error("Please verify your email before signing in.")
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

          if (!isPasswordValid) {
            // Increment login attempts
            user.loginAttempts = (user.loginAttempts || 0) + 1

            // Lock account if max attempts reached
            if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
              user.lockUntil = new Date(Date.now() + LOCK_TIME)
            }

            await user.save()
            throw new Error("Invalid password")
          }

          // Check 2FA if enabled
          if (user.twoFactorEnabled) {
            if (!credentials.twoFactorToken) {
              throw new Error("2FA_REQUIRED")
            }

            const verified = speakeasy.totp.verify({
              secret: user.twoFactorSecret,
              encoding: "base32",
              token: credentials.twoFactorToken,
              window: 2,
            })

            if (!verified) {
              throw new Error("Invalid 2FA token")
            }
          }

          // Reset login attempts on successful login
          user.loginAttempts = 0
          user.lockUntil = undefined
          user.lastLogin = new Date()
          await user.save()

          // Return user object with all necessary fields
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: credentials.role, // This is crucial - use the role from credentials
            isAdmin: credentials.role === "admin",
            image: user.profileImage || null,
            isBlocked: user.isBlocked || false,
            isEmailVerified: user.isEmailVerified || credentials.role === "admin",
            twoFactorEnabled: user.twoFactorEnabled || false,
          }
        } catch (error) {
          console.error("Authentication error:", error)
          throw new Error(error instanceof Error ? error.message : "Authentication failed")
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in - store all user data in token
      if (user) {
        token.id = user.id
        token.role = user.role
        token.isAdmin = user.isAdmin
        token.image = user.image
        token.isBlocked = user.isBlocked
        token.isEmailVerified = user.isEmailVerified
        token.twoFactorEnabled = user.twoFactorEnabled

        // Debug log to verify role is being set
        console.log("JWT Callback - Setting token:", {
          id: token.id,
          role: token.role,
          email: token.email,
          isAdmin: token.isAdmin,
        })
      }

      // Handle session updates (like profile image changes)
      if (trigger === "update" && session) {
        if (session.image) {
          token.image = session.image
        }
        if (session.name) {
          token.name = session.name
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.isAdmin = token.isAdmin as boolean
        session.user.image = token.image as string | null
        session.user.isBlocked = token.isBlocked as boolean
        session.user.isEmailVerified = token.isEmailVerified as boolean
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean

        // Debug log to verify session is being set correctly
        console.log("Session Callback - Setting session:", {
          id: session.user.id,
          role: session.user.role,
          email: session.user.email,
          isAdmin: session.user.isAdmin,
        })
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Handle redirects after sign in/out
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`
      }
      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        return url
      }
      return baseUrl
    },
  },
  pages: {
    signIn: "/role",
    error: "/role",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User ${user.email} signed in with role: ${user.role}`)
    },
    async signOut({ token }) {
      console.log(`User ${token?.email} signed out`)
    },
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
}
