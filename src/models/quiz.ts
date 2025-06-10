import mongoose from "mongoose"
import { z } from "zod"

const quizSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  title: { type: String, required: true },
  questions: [
    {
      questionText: { type: String, required: true },
      options: [{ type: String, required: true }],
      correctAnswerIndex: { type: Number, required: true },
    },
  ],
  createdAt: { type: Date, default: Date.now },
})

export const Quiz = mongoose.models?.Quiz ? mongoose.models.Quiz : mongoose.model("Quiz", quizSchema)

export const questionValidationSchema = z.object({
  questionText: z.string().min(3, "Question must be at least 3 characters"),
  options: z.array(z.string()).min(2, "At least 2 options are required"),
  correctAnswerIndex: z.number().min(0),
})

export const quizValidationSchema = z.object({
  course: z.string(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  questions: z.array(questionValidationSchema).min(1, "At least one question is required"),
})

export type QuizType = z.infer<typeof quizValidationSchema>
export type QuestionType = z.infer<typeof questionValidationSchema>
