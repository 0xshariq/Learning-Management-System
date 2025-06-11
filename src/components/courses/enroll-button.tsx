"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface EnrollButtonProps {
  courseId: string
  courseName: string
  price: number
}

type RazorpayHandlerResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

declare global {
  interface Window {
    Razorpay: {
      new (options: object): { open: () => void }
    }
  }
}

export default function EnrollButton({ courseId, courseName, price }: EnrollButtonProps) {
  const [isEnrolling, setIsEnrolling] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleFreeEnroll = async () => {
    setIsEnrolling(true)
    try {
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to enroll in course")
      }

      toast({
        title: "Enrollment Successful",
        description: "You have successfully enrolled in this course.",
      })

      router.refresh()
    } catch (error) {
      console.error("Error enrolling in course:", error)
      toast({
        title: "Enrollment Failed",
        description: error instanceof Error ? error.message : "Failed to enroll in course. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsEnrolling(false)
    }
  }

  const handlePaidEnroll = async () => {
    setIsEnrolling(true)
    try {
      // Load Razorpay script if not loaded
      if (!window.Razorpay) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script")
          script.src = "https://checkout.razorpay.com/v1/checkout.js"
          script.onload = () => resolve()
          document.body.appendChild(script)
        })
      }

      // Create order on server
      const res = await fetch("/api/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      })
      if (!res.ok) throw new Error("Failed to create payment order")
      const data = await res.json()

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: "EduLearn Platform",
        description: `Payment for ${courseName}`,
        image: "/edulearn-logo.png",
        order_id: data.orderId,
        handler: async (response: RazorpayHandlerResponse) => {
          try {
            const verifyRes = await fetch("/api/razorpay", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            })
            if (!verifyRes.ok) throw new Error("Payment verification failed")
            toast({
              title: "Payment Successful",
              description: "You have successfully enrolled in the course.",
            })
            router.refresh()
          } catch (error) {
            toast({
              title: "Payment Error",
              description: error instanceof Error ? error.message : "There was an error processing your payment.",
              variant: "destructive",
            })
          }
        },
        prefill: data.prefill,
        notes: {
          course_id: courseId,
          branding: "Pay securely using Google Pay, PhonePe, UPI or Cards",
        },
        theme: { color: "#3182ce" },
        method: { upi: true, card: true, netbanking: true, wallet: true },
        modal: {
          ondismiss: () => setIsEnrolling(false),
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (error) {
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "There was an error processing your payment.",
        variant: "destructive",
      })
    } finally {
      setIsEnrolling(false)
    }
  }

  return (
    <Button
      onClick={price === 0 ? handleFreeEnroll : handlePaidEnroll}
      disabled={isEnrolling}
      className="w-full"
    >
      {isEnrolling ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {price === 0 ? "Enrolling..." : "Processing..."}
        </>
      ) : (
        price === 0 ? "Enroll Now - Free" : `Buy Now - ₹${price}`
      )}
    </Button>
  )
}