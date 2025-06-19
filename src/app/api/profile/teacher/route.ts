import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { dbConnect } from "@/lib/dbConnect"
import { Teacher } from "@/models/teacher"
import { z } from "zod"
import { authOptions } from "@/lib/auth"

// Validation schema
const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
  email: z.string().email("Please enter a valid email address"),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  phone: z
    .string()
    .regex(/^[+]?[\d\s-()]+$/, "Please enter a valid phone number")
    .min(10, "Phone number must be at least 10 digits")
    .optional()
    .or(z.literal("")),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  profileImage: z.string().url().optional().or(z.literal("")),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const userData = await Teacher.findById(session.user.id).lean()

    if (!userData) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        _id: userData._id.toString(),
        name: userData.name,
        email: userData.email,
        bio: userData.bio || "",
        phone: userData.phone || "",
        website: userData.website || "",
        profileImage: userData.profileImage || "",
        role: "teacher",
        createdAt: userData.createdAt,
      },
    })
  } catch (error) {
    console.error("Error fetching teacher profile:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Validate the request body
    const validation = updateProfileSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: validation.error.errors.map((err) => ({
            field: err.path[0],
            message: err.message,
          })),
        },
        { status: 400 },
      )
    }

    const { name, email, bio, phone, website, profileImage } = validation.data

    await dbConnect()

    // Check if email is already taken by another teacher
    const existingTeacher = await Teacher.findOne({
      email,
      _id: { $ne: session.user.id },
    })

    if (existingTeacher) {
      return NextResponse.json({ message: "Email is already taken" }, { status: 400 })
    }

    // Update the teacher
    const updateData = {
      name,
      email,
      bio: bio || "",
      phone: phone || "",
      website: website || "",
      profileImage: profileImage || "",
      updatedAt: new Date(),
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(session.user.id, updateData, {
      new: true,
      runValidators: true,
    }).lean()

    if (!updatedTeacher) {
      return NextResponse.json({ message: "Teacher not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Profile updated successfully",
      user: {
        _id: updatedTeacher._id.toString(),
        name: updatedTeacher.name,
        email: updatedTeacher.email,
        bio: updatedTeacher.bio || "",
        phone: updatedTeacher.phone || "",
        website: updatedTeacher.website || "",
        profileImage: updatedTeacher.profileImage || "",
        role: "teacher",
      },
    })
  } catch (error) {
    console.error("Error updating teacher profile:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
