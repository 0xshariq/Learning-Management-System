import { NextResponse } from "next/server"
import { dbConnect } from "@/lib/dbConnect"
import { Admin } from "@/models/admin"

export async function GET() {
  try {
    await dbConnect()

    // Check if any admin exists
    const adminCount = await Admin.countDocuments()

    return NextResponse.json({ exists: adminCount > 0 }, { status: 200 })
  } catch (error) {
    console.error("Error checking admin existence:", error)
    return NextResponse.json({ exists: false, error: "Failed to check admin existence" }, { status: 500 })
  }
}
