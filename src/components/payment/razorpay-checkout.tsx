"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import Image from "next/image"

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

      // Razorpay options with branding and notes
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: "LMS Platform",
        description: `Payment for ${courseName}`,
        image: "/edulearn-logo.png", // Place your logo in public/
        order_id: data.orderId,
        handler: async (response: RazorpayHandlerResponse) => {
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
        notes: {
          course_id: courseId,
          branding: "Pay securely using Google Pay, PhonePe, UPI or Cards",
        },
        theme: {
          color: "#3182ce",
        },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
        },
        // Show Google Pay icon and other UPI apps (Razorpay does this automatically on supported devices)
        // No extra config needed for Google Pay icon
        modal: {
          ondismiss: () => {
            setIsLoading(false)
          },
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
    <Button onClick={handlePayment} disabled={isLoading} className="w-full flex items-center justify-center gap-2">
      {isLoading ? (
        "Processing..."
      ) : (
        <>
          <Image
            src="/gpay-icon.svg"
            alt="Google Pay"
            className="h-5 w-5"
            style={{ display: "inline" }}
          />
          Pay ₹{price} (UPI, Google Pay, Card)
        </>
      )}
    </Button>
  )
}