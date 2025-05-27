import mongoose from "mongoose"
import { z } from "zod"

const liveClassSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  topic: { type: String, required: true },
  date: { type: Date, required: true },
  meetingLink: { type: String, required: true },
})

export const LiveClass = mongoose.models?.LiveClass ? mongoose.models.LiveClass : mongoose.model("LiveClass", liveClassSchema)

export const liveClassValidationSchema = z.object({
  course: z.string(),
  teacher: z.string(),
  topic: z.string().min(3, "Topic must be at least 3 characters"),
  date: z.date(),
  meetingLink: z.string().url("Invalid meeting link"),
})

export type LiveClassType = z.infer<typeof liveClassValidationSchema>
