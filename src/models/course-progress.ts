import mongoose from "mongoose"
import { z } from "zod"

const courseProgressSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  completedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }], // Which videos completed
  percentageCompleted: { type: Number, default: 0 }, // Example: 25%, 50%
  updatedAt: { type: Date, default: Date.now },
})

export const CourseProgress = mongoose.models?.CourseProgress ? mongoose.models.CourseProgress : mongoose.model("CourseProgress", courseProgressSchema)

export const courseProgressValidationSchema = z.object({
  student: z.string(),
  course: z.string(),
  completedVideos: z.array(z.string()),
  percentageCompleted: z.number().min(0).max(100, "Percentage must be between 0 and 100"),
})

export type CourseProgressType = z.infer<typeof courseProgressValidationSchema>
