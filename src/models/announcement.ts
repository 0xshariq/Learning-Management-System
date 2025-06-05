import mongoose from "mongoose"
import { z } from "zod"

const announcementSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

export const Announcement = mongoose.models?.Announcement ? mongoose.models.Announcement : mongoose.model("Announcement", announcementSchema)

export const announcementValidationSchema = z.object({
  course: z.string(),
  teacher: z.string(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
})

export type AnnouncementType = z.infer<typeof announcementValidationSchema>
