"use client"

import { useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw } from "lucide-react"

interface FAQ {
  question: string
  answer: string
}

// Initial FAQs to show while loading
const initialFaqs: FAQ[] = [
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
]

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>(initialFaqs)
  const [loading, setLoading] = useState(false)

  const generateNewFaqs = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/generate-faqs")
      if (!response.ok) throw new Error("Failed to generate FAQs")

      const data = await response.json()
      setFaqs(data.faqs)
    } catch (error) {
      console.error("Error generating FAQs:", error)
      // Keep the current FAQs if there's an error
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Frequently Asked Questions</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
          Find answers to common questions about our learning platform. Can't find what you're looking for? Try
          generating new questions or contact our support team.
        </p>
        <Button onClick={generateNewFaqs} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Generate New Questions
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Common Questions</CardTitle>
          <CardDescription>Expand the questions below to see the answers</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {loading
              ? // Show skeletons while loading
                Array(5)
                  .fill(0)
                  .map(() => {
                    const uniqueKey = crypto.randomUUID()
                    return (
                      <AccordionItem key={uniqueKey} value={uniqueKey}>
                        <AccordionTrigger className="py-4">
                          <Skeleton className="h-6 w-full max-w-[300px]" />
                        </AccordionTrigger>
                        <AccordionContent>
                          <Skeleton className="h-20 w-full" />
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })
              : faqs.map((faq) => (
                  <AccordionItem key={faq.question} value={faq.question}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">{faq.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
