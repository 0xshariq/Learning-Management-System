import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize the Google Generative AI with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "")

export async function GET() {
  try {
    // Access the Gemini 2.0 Flash modelj
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `Generate 5 frequently asked questions and answers about a learning management system platform. 
    The platform offers courses from various teachers, has student enrollment, video lessons, quizzes, and certificates.
    Format the response as a JSON array with 'question' and 'answer' fields for each FAQ.
    Make the questions diverse, covering different aspects of the platform like enrollment, payments, teacher applications, technical issues, and course content.
    Keep answers concise but informative.`

    // Generate content with Gemini
    const result = await model.generateContent(prompt)
    const response =  result.response
    const text = response.text()

    // Parse the response as JSON
    const faqs = JSON.parse(text)

    return Response.json({ faqs })
  } catch (error) {
    console.error("Error generating FAQs:", error)
    return Response.json(
      {
        error: "Failed to generate FAQs",
        faqs: [
          {
            question: "How do I enroll in a course?",
            answer:
              "To enroll in a course, navigate to the course page and click the 'Enroll' button. You may need to complete the payment process if it's a paid course.",
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
            question: "What payment methods are accepted?",
            answer:
              "We accept credit/debit cards, PayPal, and bank transfers. All payments are processed securely through our payment gateway.",
          },
          {
            question: "Can I get a refund if I'm not satisfied with a course?",
            answer:
              "Yes, we offer a 30-day money-back guarantee for most courses. Please check the specific course refund policy before enrolling.",
          },
        ],
      },
      { status: 200 },
    )
  }
}
