import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize the Google AI model
const initGoogleAI = () => {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not defined")
  }
  return new GoogleGenerativeAI(apiKey)
}

export async function GET() {
  try {
    // Check if API key exists
    if (!process.env.GOOGLE_AI_API_KEY) {
      // Fallback to static FAQs if no API key
      return NextResponse.json({
        faqs: getStaticFaqs(),
        source: "static",
      })
    }

    // Initialize Google AI
    const genAI = initGoogleAI()
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Create prompt for FAQ generation
    const prompt = `
      Generate 5 frequently asked questions and answers about an online learning platform.
      The questions should cover topics like course enrollment, payment methods, accessing content,
      becoming a teacher, and refund policies.
      
      Format the response as a valid JSON array with 'question' and 'answer' fields for each FAQ.
      Do not include any markdown, explanations, or other text outside the JSON array.
    `

    // Generate content
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extract JSON from the response
    // This handles cases where the model might add extra text before or after the JSON
    const jsonMatch = text.match(/\[[\s\S]*\]/)

    if (!jsonMatch) {
      throw new Error("Failed to parse JSON from AI response")
    }

    let faqs: { question: string; answer: string }[]
    try {
      faqs = JSON.parse(jsonMatch[0])

      // Validate the structure of each FAQ
      if (
        !Array.isArray(faqs) ||
        !faqs.every(
          (faq) => typeof faq === "object" && typeof faq.question === "string" && typeof faq.answer === "string",
        )
      ) {
        throw new Error("Invalid FAQ structure")
      }
    } catch (error) {
      console.error("JSON parsing error:", error)
      // Fallback to static FAQs if parsing fails
      faqs = getStaticFaqs()
    }

    return NextResponse.json({
      faqs,
      source: faqs === getStaticFaqs() ? "static" : "ai",
    })
  } catch (error) {
    console.error("Error generating FAQs:", error)

    // Return static FAQs as fallback with error information
    return NextResponse.json({
      faqs: getStaticFaqs(),
      source: "static",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

// Fallback static FAQs
function getStaticFaqs() {
  return [
    {
      question: "How do I enroll in a course?",
      answer:
        "To enroll in a course, navigate to the course page and click the 'Enroll' button. You may need to complete the payment process if it's a paid course.",
    },
    {
      question: "What payment methods are accepted?",
      answer:
        "We accept credit/debit cards, PayPal, and bank transfers. All payments are processed securely through our payment gateway.",
    },
    {
      question: "Can I access courses on mobile devices?",
      answer:
        "Yes, our platform is fully responsive and works on all devices including smartphones and tablets. You can learn on the go!",
    },
    {
      question: "How do I become a teacher on the platform?",
      answer:
        "To become a teacher, sign up for a teacher account and complete your profile. You'll need to provide information about your expertise and the courses you plan to teach.",
    },
    {
      question: "Can I get a refund if I'm not satisfied with a course?",
      answer:
        "Yes, we offer a 30-day money-back guarantee for most courses. Please check the specific course refund policy before enrolling.",
    },
  ]
}
