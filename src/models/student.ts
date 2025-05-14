import mongoose from "mongoose"
import { z } from "zod"

// Define the student schema
const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    progress: [{ type: mongoose.Schema.Types.ObjectId, ref: "CourseProgress" }],
    certificates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Certificate" }],
  },
  { timestamps: true },
)

// Create the Student model - Fix the model definition to prevent errors
export const Student =
  mongoose.models?.Student ? mongoose.models.Student : mongoose.model("Student", studentSchema)

// Zod validation schema
export const studentValidationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export type StudentType = z.infer<typeof studentValidationSchema>
