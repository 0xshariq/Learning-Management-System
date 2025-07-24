import mongoose from "mongoose"
import { z } from "zod"

const liveClassSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  title: { type: String, required: true },
  description: { type: String },
  scheduledDate: { type: Date, required: true },
  duration: { type: Number, default: 60 }, // in minutes
  isLive: { type: Boolean, default: false },
  streamId: { type: String, required: true },
  streamKey: { type: String, required: true },
  chatSecret: { type: String, required: true },
  startedAt: { type: Date },
  endedAt: { type: Date },
  attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  recordingUrl: { type: String },
  status: { 
    type: String, 
    enum: ['scheduled', 'live', 'ended', 'cancelled'], 
    default: 'scheduled' 
  }
}, {
  timestamps: true
})

export const LiveClass = mongoose.models?.LiveClass ? mongoose.models.LiveClass : mongoose.model("LiveClass", liveClassSchema)

export const liveClassValidationSchema = z.object({
  course: z.string().min(1, "Course is required"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  scheduledDate: z.string().transform((str) => new Date(str)),
  duration: z.number().min(15).max(300).default(60),
})

export const updateLiveClassStatusSchema = z.object({
  status: z.enum(['scheduled', 'live', 'ended', 'cancelled']),
  startedAt: z.string().transform((str) => new Date(str)).optional(),
  endedAt: z.string().transform((str) => new Date(str)).optional(),
})

export type LiveClassType = z.infer<typeof liveClassValidationSchema>
export type UpdateLiveClassStatusType = z.infer<typeof updateLiveClassStatusSchema>
