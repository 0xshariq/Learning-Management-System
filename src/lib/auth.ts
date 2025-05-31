import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
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
        email: { label: "Email", type: "email", name: "email" },
        password: { label: "Password", type: "password", name: "password" },
        role: { label: "Role", type: "text", name: "role" }
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
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: "student", // Default role for Google sign-in
          isAdmin: false,
          isBlocked: false,
          isEmailVerified: true, // Google accounts are always verified
          twoFactorEnabled: false,
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
        token.name = user.name
        token.isAdmin = user.isAdmin
        token.image = user.image
        token.isBlocked = user.isBlocked

        // Debug log to verify role is being set
        console.log("JWT Callback - Setting token:", {
          id: token.id,
          role: token.role,
          name: user.name,
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
