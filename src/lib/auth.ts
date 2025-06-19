import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
// import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { dbConnect } from "@/lib/dbConnect"
import { Student } from "@/models/student"
import { Teacher } from "@/models/teacher"
import { Admin } from "@/models/admin"

const MAX_LOGIN_ATTEMPTS = 5
const LOCK_TIME = 2 * 60 * 60 * 1000 // 2 hours
export const runtime = "nodejs";
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

        let user = null
        let userModel: typeof Student | typeof Teacher | typeof Admin

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

        user = await (userModel as typeof Student | typeof Teacher | typeof Admin).findOne({ email: credentials.email })

        if (!user) throw new Error("No user found with this email")

        if (user.isLocked) {
          throw new Error("Account is temporarily locked due to too many failed login attempts")
        }

        if (credentials.role !== "admin" && user.isBlocked) {
          throw new Error("Your account has been blocked. Please contact support.")
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        if (!isPasswordValid) {
          user.loginAttempts = (user.loginAttempts || 0) + 1
          if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            user.lockUntil = new Date(Date.now() + LOCK_TIME)
          }
          await user.save()
          throw new Error("Invalid password")
        }

        user.loginAttempts = 0
        user.lockUntil = undefined
        user.lastLogin = new Date()
        await user.save()

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: credentials.role,
          isAdmin: credentials.role === "admin",
          image: user.profileImage || null,
          isBlocked: user.isBlocked || false
        }
      },
    }),
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID || "",
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    //   authorization: {
    //     params: {
    //       prompt: "consent",
    //       access_type: "offline",
    //       response_type: "code",
    //     },
    //   },
    //   profile(profile) {
    //     return {
    //       id: profile.sub,
    //       name: profile.name,
    //       email: profile.email,
    //       image: profile.picture,
    //       role: "student",
    //       isAdmin: false,
    //       isBlocked: false
    //     }
    //   },
    // }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.name = user.name || user.email?.split("@")[0] || user.role?.toUpperCase() || "User"
        token.email = user.email
        token.role = user.role
        token.isAdmin = user.isAdmin
        token.isBlocked = user.isBlocked
        token.image = user.image
      }
      if (trigger === "update" && session) {
        if (session.image) token.image = session.image
        if (session.name) token.name = session.name
      }
      return token
    },
    async session({ session, token }) {
        session.user = {
          id: token.id as string,
          role: token.role as string,
          name: token.name as string,
          email: token.email as string,
          isAdmin: token.isAdmin as boolean,
          image: token.image as string | null,
          isBlocked: token.isBlocked as boolean,
        }
      
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  pages: {
    signIn: "/role",
    error: "/role",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  events: {
    async signIn({ user }) {
      console.log(`User ${user.email} signed in with role: ${user.role}`)
    },
    async signOut({ token }) {
      console.log(`User ${token?.email} signed out`)
    },
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
}