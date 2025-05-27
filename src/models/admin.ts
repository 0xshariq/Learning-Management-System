import mongoose from "mongoose"
import { z } from "zod"

// Define the admin schema
const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { timestamps: true },
)

// Create the Admin model - Fix the model definition to prevent errors by checking if mongoose.models is defined
export const Admin =
  mongoose.models?.Admin ? mongoose.models.Admin : mongoose.model("Admin", adminSchema)

// Zod validation schema
export const adminValidationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export type AdminType = z.infer<typeof adminValidationSchema>
