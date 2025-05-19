import mongoose from "mongoose"
import { z } from "zod"

const certificateSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  issueDate: { type: Date, default: Date.now },
  certificateUrl: { type: String, required: true }, // Certificate PDF or Image URL
})

export const Certificate = mongoose.models?.Certificate ? mongoose.models.Certificate : mongoose.model("Certificate", certificateSchema)

export const certificateValidationSchema = z.object({
  student: z.string(),
  course: z.string(),
  issueDate: z.date().default(() => new Date()),
  certificateUrl: z.string().url("Invalid certificate URL"),
})

export type CertificateType = z.infer<typeof certificateValidationSchema>
