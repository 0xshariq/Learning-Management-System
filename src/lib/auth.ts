import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { dbConnect } from "@/lib/dbConnect"
import { Student } from "@/models/student"
import { Teacher } from "@/models/teacher"
import { Admin } from "@/models/admin"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
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

          // Check if user is blocked (for students and teachers)
          if (credentials.role !== "admin" && user.isBlocked) {
            throw new Error("Your account has been blocked. Please contact support.")
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

          if (!isPasswordValid) {
            throw new Error("Invalid password")
          }

          // Return user object with all necessary fields
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: credentials.role,
            isAdmin: credentials.role === "admin",
            image: user.profileImage || null,
            isBlocked: user.isBlocked || false,
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
      // Initial sign in
      if (user) {
        token.id = user.id
        token.role = user.role
        token.isAdmin = user.isAdmin
        token.image = user.image
        token.isBlocked = user.isBlocked
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
    maxAge: 60 * 60, // 30 days
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
