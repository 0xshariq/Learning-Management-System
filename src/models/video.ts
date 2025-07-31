import mongoose from "mongoose"
import { z } from "zod"

// Define the video schema
const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    url: { type: String, required: true },
    hlsUrl: { type: String }, // HLS stream URL
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    position: { type: Number, required: true },
    duration: { type: String },
    captionsUrl: { type: String }, // Added field for captions URL
    quality: { type: String, enum: ['low', 'medium', 'high', 'adaptive'] },
    bitrate: { type: Number }, // Video bitrate in kbps
    resolution: { type: String }, // Video resolution (e.g., "1920x1080")
    framerate: { type: Number }, // Video framerate
    isProcessed: { type: Boolean, default: false }, // Whether video has been processed for HLS
    processingStatus: { 
      type: String, 
      enum: ['pending', 'processing', 'completed', 'failed'], 
      default: 'pending' 
    },
    processingError: { type: String }, // Error message if processing failed
    fileSize: { type: Number }, // File size in bytes
    format: { type: String }, // Video format (mp4, avi, etc.)
    codec: { type: String }, // Video codec
    audioCodec: { type: String }, // Audio codec
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
  hlsUrl: z.string().url("Invalid HLS URL").optional(),
  course: z.string(),
  position: z.number().int().min(0, "Position must be a non-negative integer"),
  duration: z.string().optional(),
  captionsUrl: z.string().url("Invalid captions URL").optional(),
  quality: z.enum(['low', 'medium', 'high', 'adaptive']).optional(),
  bitrate: z.number().optional(),
  resolution: z.string().optional(),
  framerate: z.number().optional(),
  isProcessed: z.boolean().optional(),
  processingStatus: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  processingError: z.string().optional(),
  fileSize: z.number().optional(),
  format: z.string().optional(),
  codec: z.string().optional(),
  audioCodec: z.string().optional(),
})

export type VideoType = z.infer<typeof videoValidationSchema>