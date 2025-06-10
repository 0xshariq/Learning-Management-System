import type { DefaultSession, DefaultUser } from "next-auth"
import type { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
      isAdmin?: boolean
      isBlocked?: boolean
      image?: string | null
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    id: string
    name: string
    email: string
    role: string
    isAdmin?: boolean
    isBlocked?: boolean
    image?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    name: string
    email: string
    role: string
    isAdmin?: boolean
    isBlocked?: boolean
    image?: string | null
  }
}
