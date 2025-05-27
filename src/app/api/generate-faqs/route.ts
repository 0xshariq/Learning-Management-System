import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Define a type for the FAQ structure
interface FAQ {
  question: string
  answer: string
}

// Fallback FAQs in case the API fails
const fallbackFAQs: FAQ[] = [
  {
    question: "What courses are available on the platform?",
    answer:
      "Our platform offers a wide range of courses across various categories including programming, design, business, marketing, and more. You can browse all courses on our courses page.",
  },
  {
    question: "How do I enroll in a course?",
    answer:
      "To enroll in a course, simply navigate to the course page, click on the 'Enroll' button, and complete the payment process if it's a paid course.",
  },
  {
    question: "Can I get a refund if I'm not satisfied with a course?",
    answer:
      "Yes, we offer a 30-day money-back guarantee for most courses. If you're not satisfied, you can request a refund within 30 days of purchase.",
  },
  {
    question: "How do I become an instructor?",
    answer:
      "To become an instructor, sign up for a teacher account and complete your profile. You can then create and publish courses after they've been approved by our team.",
  },
  {
    question: "How do certificates work?",
    answer:
      "Upon completing a course, you'll receive a certificate of completion that you can download, print, or share on your social media profiles.",
  },
]

export async function GET() {
  try {
    // Check if API key is available
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      console.error("Google AI API key is missing")
      return NextResponse.json({ faqs: fallbackFAQs })
    }

    // Initialize the Google AI client
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    // Create a structured prompt that explicitly asks for JSON
    const prompt = `
      Generate 5 frequently asked questions and answers about online learning platforms and courses.
      
      Return ONLY a valid JSON array with objects containing 'question' and 'answer' fields.
      
      Example format:
      [
        {
          "question": "What is an online learning platform?",
          "answer": "An online learning platform is a website or application that provides educational courses and materials that can be accessed remotely via the internet."
        }
      ]
      
      Make sure the questions are diverse and cover different aspects of online learning.
    `

    // Generate content
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extract JSON from the response
    let faqs: FAQ[] = []
    try {
      // Find JSON array in the response
      const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/)
      if (jsonMatch) {
        faqs = JSON.parse(jsonMatch[0])
      } else {
        // If no JSON array found, try to parse the entire response
        faqs = JSON.parse(text)
      }

      // Validate the structure
      if (
        !Array.isArray(faqs) ||
        !faqs.every(
          (faq) => typeof faq === "object" && typeof faq.question === "string" && typeof faq.answer === "string",
        )
      ) {
        throw new Error("Invalid FAQ structure")
      }
    } catch (error) {
      console.error("Error parsing FAQs:", error)
      return NextResponse.json({ faqs: fallbackFAQs })
    }

    return NextResponse.json({ faqs })
  } catch (error) {
    console.error("Error generating FAQs:", error)
    return NextResponse.json({ faqs: fallbackFAQs })
  }
}
