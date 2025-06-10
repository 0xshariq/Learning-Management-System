import {  NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // For admin, we'll return basic session data since admin might not have a database record
    return NextResponse.json({
      user: {
        _id: session.user.id,
        name: session.user.name || "Admin",
        email: session.user.email || "admin@example.com",
        bio: "",
        phone: "",
        website: "",
        profileImage: "",
        role: "admin",
        createdAt: new Date(),
      },
    })
  } catch (error) {
    console.error("Error fetching admin profile:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT() {
  try {
    const session = await getServerSession()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // For now, admin profile updates are limited
    // You can extend this based on your admin model
    return NextResponse.json({
      message: "Admin profile update not implemented",
      user: {
        _id: session.user.id,
        name: session.user.name || "Admin",
        email: session.user.email || "admin@example.com",
        bio: "",
        phone: "",
        website: "",
        profileImage: "",
        role: "admin",
      },
    })
  } catch (error) {
    console.error("Error updating admin profile:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
