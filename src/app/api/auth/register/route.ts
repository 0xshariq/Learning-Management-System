import { NextResponse } from "next/server"
import dbConnect from "@/lib/dbConnect"
import { Student, studentValidationSchema } from "@/models/student"
import { Teacher, teacherValidationSchema } from "@/models/teacher"
import { Admin, adminValidationSchema } from "@/models/admin"
import bcrypt from "bcryptjs"
import { z } from "zod"

// Define validation schemas with role
const studentRegisterSchema = studentValidationSchema.extend({
  role: z.literal("student"),
})

const teacherRegisterSchema = teacherValidationSchema.extend({
  role: z.literal("teacher"),
})

const adminRegisterSchema = adminValidationSchema.extend({
  role: z.literal("admin"),
})

// Union type for all possible registration data
const registerSchema = z.discriminatedUnion("role", [studentRegisterSchema, teacherRegisterSchema, adminRegisterSchema])

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate the request body against the appropriate schema
    const result = registerSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: result.error.errors,
        },
        { status: 400 },
      )
    }

    const validatedData = result.data
    const { role } = validatedData

    await dbConnect()

    // Check if user already exists in the appropriate collection
    let existingUser = null

    if (role === "student") {
      existingUser = await Student.findOne({ email: validatedData.email })
    } else if (role === "teacher") {
      existingUser = await Teacher.findOne({ email: validatedData.email })
    } else if (role === "admin") {
      existingUser = await Admin.findOne({ email: validatedData.email })
    }

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 409 })
    }

    // Check if trying to register as admin
    if (role === "admin") {
      // Check if admin already exists
      const existingAdmin = await Admin.findOne({})

      if (existingAdmin) {
        return NextResponse.json({ message: "Admin account already exists" }, { status: 403 })
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Create user in the appropriate collection
    let user = null

    if (role === "student") {
      user = await Student.create({
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
      })
    } else if (role === "teacher") {
      user = await Teacher.create({
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        upiId: validatedData.upiId,
        age: validatedData.age,
      })
    } else if (role === "admin") {
      user = await Admin.create({
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
      })
    }

    // Remove password from response
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: role,
      isAdmin: role === "admin",
    }

    return NextResponse.json({ message: "User created successfully", user: userResponse }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation error", errors: error.errors }, { status: 400 })
    }

    console.error("Registration error:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
