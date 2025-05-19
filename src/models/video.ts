import mongoose from "mongoose"
import { z } from "zod"

// Define the video schema
const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    url: { type: String, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    position: { type: Number, required: true },
    duration: { type: String },
    captionsUrl: { type: String }, // Added field for captions URL
  },
  { timestamps: true }
)

// Create the Video model
export const Video = mongoose.models?.Video ? mongoose.models.Video : mongoose.model("Video", videoSchema)
// Zod validation schema
export const videoValidationSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  url: z.string().url("Invalid video URL"),
  course: z.string(),
  position: z.number().int().min(0, "Position must be a non-negative integer"),
  duration: z.string().optional(),
  captionsUrl: z.string().url("Invalid captions URL").optional(),
})

export type VideoType = z.infer<typeof videoValidationSchema>