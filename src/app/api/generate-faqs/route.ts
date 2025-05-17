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
    question: "How do I enroll in a course?",
    answer:
      "To enroll in a course, navigate to the course page and click the 'Enroll' or 'Buy Now' button. Follow the payment instructions if it's a paid course.",
  },
  {
    question: "Can I get a refund if I'm not satisfied with a course?",
    answer:
      "Yes, we offer a 30-day money-back guarantee for most courses. Contact our support team with your order details to process a refund.",
  },
  {
    question: "How long do I have access to a course after purchasing?",
    answer:
      "Once you purchase a course, you have lifetime access to the course materials, including any future updates.",
  },
  {
    question: "Can I download course videos for offline viewing?",
    answer:
      "This depends on the course. Some instructors allow video downloads, while others don't. Check the course details page for specific information.",
  },
  {
    question: "How do I get a certificate after completing a course?",
    answer:
      "Certificates are automatically generated once you complete all required modules and assessments. You can download your certificate from your dashboard.",
  },
]

export async function GET() {
  try {
    // Check if Google AI API key is available
    const apiKey = process.env.GOOGLE_AI_API_KEY

    if (!apiKey) {
      console.warn("Google AI API key not found, using fallback FAQs")
      return NextResponse.json({ faqs: fallbackFAQs }, { status: 200 })
    }

    // Initialize the Google Generative AI with the API key
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Create a structured prompt for FAQ generation
    const prompt = `
      Generate 5 frequently asked questions (FAQs) about online learning platforms or e-learning.
      Each FAQ should have a question and a detailed answer.
      Format the response as a valid JSON array with objects containing 'question' and 'answer' fields.
      Example format:
      [
        {
          "question": "How do I reset my password?",
          "answer": "To reset your password, click on the 'Forgot Password' link on the login page..."
        }
      ]
    `

    // Generate content with the model
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extract JSON from the response
    let faqs: FAQ[] = []
    try {
      // Find JSON array in the response text
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        faqs = JSON.parse(jsonMatch[0])

        // Validate the structure of each FAQ
        if (
          !Array.isArray(faqs) ||
          !faqs.every(
            (faq) =>
              typeof faq === "object" &&
              faq !== null &&
              "question" in faq &&
              "answer" in faq &&
              typeof faq.question === "string" &&
              typeof faq.answer === "string",
          )
        ) {
          throw new Error("Invalid FAQ structure")
        }
      } else {
        throw new Error("No JSON array found in response")
      }
    } catch (error) {
      console.error("Error parsing AI response:", error)
      console.log("Raw AI response:", text)

      // Use fallback FAQs if parsing fails
      faqs = fallbackFAQs
    }

    return NextResponse.json({ faqs }, { status: 200 })
  } catch (error) {
    console.error("Error generating FAQs:", error)

    // Return fallback FAQs in case of any error
    return NextResponse.json(
      {
        faqs: fallbackFAQs,
        error: "Failed to generate FAQs, using fallback data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 },
    )
  }
}
