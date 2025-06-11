"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface RazorpayCheckoutProps {
  courseId: string
  courseName: string
  price: number
  couponCode?: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

interface RazorpayResponse {
  order: {
    id: string
  }
  key: string
  amount: number
  currency: string
  name: string
  description: string
  orderId: string
  prefill: {
    name?: string
    email?: string
  }
}

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function RazorpayCheckout({
  courseId,
  courseName,
  price,
  couponCode,
  onSuccess,
  onError,
}: RazorpayCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handlePayment = async () => {
    setIsLoading(true)

    try {
      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        await loadRazorpayScript()
      }

      // Create order on server
      const response = await fetch("/api/razorpay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          couponCode,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create payment order")
      }

      const data: RazorpayResponse = await response.json()

      // Initialize Razorpay
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: "LMS Platform",
        description: `Payment for ${courseName}`,
        order_id: data.orderId,
        handler: async (response: any) => {
          try {
            // Verify payment on server
            const verifyResponse = await fetch("/api/razorpay", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                courseId,
              }),
            })

            if (!verifyResponse.ok) {
              throw new Error("Payment verification failed")
            }

            toast({
              title: "Payment Successful",
              description: "You have successfully enrolled in the course",
            })

            if (onSuccess) {
              onSuccess()
            }

            // Redirect to course page
            router.push(`/courses/${courseId}`)
            router.refresh()
          } catch (error) {
            console.error("Payment verification error:", error)
            toast({
              title: "Payment Error",
              description: "There was an error verifying your payment",
              variant: "destructive",
            })

            if (onError) {
              onError("Payment verification failed")
            }
          }
        },
        prefill: data.prefill,
        theme: {
          color: "#3182ce",
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (error) {
      console.error("Payment error:", error)
      toast({
        title: "Payment Error",
        description: "There was an error processing your payment",
        variant: "destructive",
      })

      if (onError) {
        onError("Failed to initiate payment")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const loadRazorpayScript = () => {
    return new Promise<void>((resolve) => {
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.onload = () => resolve()
      document.body.appendChild(script)
    })
  }

  return (
    <Button onClick={handlePayment} disabled={isLoading} className="w-full">
      {isLoading ? "Processing..." : `Pay ₹${price}`}
    </Button>
  )
}
