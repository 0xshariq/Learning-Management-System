"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle, BookOpen } from "lucide-react"

interface EnrollmentSectionProps {
  courseId: string
  courseName: string
  price: number
  isEnrolled: boolean
  hasVideos: boolean
  firstVideoId?: string
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

export function EnrollmentSection({
  courseId,
  courseName,
  price,
  isEnrolled,
  hasVideos,
  firstVideoId,
}: EnrollmentSectionProps) {
  const { data: session } = useSession()
  const [isEnrolling, setIsEnrolling] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleFreeEnrollment = async () => {
    if (!session?.user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to enroll in this course.",
        variant: "destructive",
      })
      router.push("/role")
      return
    }

    if (session.user.role !== "student") {
      toast({
        title: "Access denied",
        description: "Only students can enroll in courses. Please sign in with a student account.",
        variant: "destructive",
      })
      return
    }

    setIsEnrolling(true)

    try {
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to enroll in course")
      }

      toast({
        title: "Enrollment Successful! 🎉",
        description: "You have successfully enrolled in this course. Start learning now!",
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

  const handlePaidEnrollment = async () => {
    if (!session?.user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to enroll in this course.",
        variant: "destructive",
      })
      router.push("/role")
      return
    }

    if (session.user.role !== "student") {
      toast({
        title: "Access denied",
        description: "Only students can enroll in courses. Please sign in with a student account.",
        variant: "destructive",
      })
      return
    }

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

  if (isEnrolled) {
    return (
      <div className="space-y-4">
        <div className="flex items-center text-green-600 bg-green-50 p-3 rounded-lg">
          <CheckCircle className="h-5 w-5 mr-2" />
          <span className="font-medium">You&apos;re enrolled in this course</span>
        </div>
        {hasVideos && firstVideoId ? (
          <Link href={`/courses/${courseId}/learn/${firstVideoId}`}>
            <Button className="w-full" size="lg">
              <BookOpen className="mr-2 h-4 w-4" /> Continue Learning
            </Button>
          </Link>
        ) : (
          <Button className="w-full" size="lg" disabled>
            <BookOpen className="mr-2 h-4 w-4" /> No videos available yet
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-3xl font-bold mb-2">{price === 0 ? "Free" : `₹${price}`}</div>
        {price === 0 && <p className="text-sm text-muted-foreground">No payment required</p>}
      </div>

      {session?.user ? (
        price === 0 ? (
          <Button onClick={handleFreeEnrollment} disabled={isEnrolling} className="w-full" size="lg">
            {isEnrolling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enrolling...
              </>
            ) : (
              "Enroll Now - Free"
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            <Button onClick={handlePaidEnrollment} disabled={isEnrolling} className="w-full flex items-center justify-center gap-2" size="lg">
              {isEnrolling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                <>Buy Now - ₹{price}</>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">Secure payment via Razorpay</p>
          </div>
        )
      ) : (
        <Link href="/role">
          <Button className="w-full" size="lg">
            Sign in to Enroll
          </Button>
        </Link>
      )}

      <p className="text-sm text-center text-muted-foreground">30-day money-back guarantee</p>
    </div>
  )
}