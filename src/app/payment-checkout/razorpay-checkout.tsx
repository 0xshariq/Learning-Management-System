"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { paymentValidationSchema } from "@/models/payment"

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

const paymentOptions = [
  {
    value: "upi",
    label: "UPI / Google Pay",
    icon: "/gpay-icon.svg",
  },
  {
    value: "card",
    label: "Credit/Debit Card",
    icon: "/card-icon.svg",
    brands: [
      { value: "visa", label: "Visa", icon: "/visa.svg" },
      { value: "mastercard", label: "MasterCard", icon: "/mastercard.svg" },
      { value: "rupay", label: "RuPay", icon: "/rupay.svg" },
      { value: "amex", label: "Amex", icon: "/amex.svg" },
    ],
  },
  {
    value: "netbanking",
    label: "Netbanking",
    icon: "/netbanking-icon.svg",
  },
  {
    value: "wallet",
    label: "Wallet",
    icon: "/wallet-icon.svg",
  },
]

export default function PaymentCheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const courseId = searchParams.get("courseId") || ""
  const courseName = searchParams.get("courseName") || ""
  const price = Number(searchParams.get("price") || 0)

  const [isLoading, setIsLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState("upi")
  const [selectedCardBrand, setSelectedCardBrand] = useState("visa")

  useEffect(() => {
    if (!courseId || !courseName || !price) {
      toast({
        title: "Invalid Payment Link",
        description: "Missing course information. Please try again.",
        variant: "destructive",
      })
      router.push("/")
    }
    // eslint-disable-next-line
  }, [])

  const handlePayment = async () => {
    setIsLoading(true)
    try {
      if (!window.Razorpay) {
        await loadRazorpayScript()
      }

      // Validate payment data using the schema (optional, for frontend safety)
      const validation = paymentValidationSchema
        .omit({ student: true, course: true, amount: true, razorpayPaymentId: true, status: true })
        .extend({
          courseId: paymentValidationSchema.shape.course,
        })
        .safeParse({
          courseId,
          paymentOption: selectedOption,
          cardBrand: selectedOption === "card" ? selectedCardBrand : undefined,
        })

      if (!validation.success) {
        toast({
          title: "Invalid Payment Data",
          description: "Please select a valid payment option.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const response = await fetch("/api/razorpay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          paymentOption: selectedOption,
          cardBrand: selectedOption === "card" ? selectedCardBrand : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create payment order")
      }

      const data = await response.json()

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: "LMS Platform",
        description: `Payment for ${courseName}`,
        image: "/edulearn-logo.png",
        order_id: data.orderId,
        handler: async (response: RazorpayHandlerResponse) => {
          try {
            const verifyResponse = await fetch("/api/razorpay", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                paymentOption: selectedOption,
                cardBrand: selectedOption === "card" ? selectedCardBrand : undefined,
              }),
            })

            if (!verifyResponse.ok) {
              throw new Error("Payment verification failed")
            }

            toast({
              title: "Payment Successful",
              description: "You have successfully enrolled in the course",
            })

            router.push(`/courses/${courseId}`)
            router.refresh()
          } catch (error) {
            toast({
              title: "Payment Error",
              description: error instanceof Error ? error.message : "An error occurred during payment verification",
              variant: "destructive",
            })
          }
        },
        prefill: data.prefill,
        notes: {
          course_id: courseId,
          branding: "Pay securely using Google Pay, PhonePe, UPI or Cards",
          payment_option: selectedOption,
          card_brand: selectedOption === "card" ? selectedCardBrand : undefined,
        },
        theme: {
          color: "#3182ce",
        },
        method: {
          upi: selectedOption === "upi",
          card: selectedOption === "card",
          netbanking: selectedOption === "netbanking",
          wallet: selectedOption === "wallet",
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false)
          },
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (error) {
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "An error occurred while processing the payment", 
        variant: "destructive",
      })
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
    <div>
      <h2 className="text-2xl font-bold mb-4 text-center">Checkout for {courseName}</h2>
      <div className="mb-4 flex flex-wrap gap-3 justify-center">
        {paymentOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
            className={`flex items-center gap-2 border rounded-lg px-4 py-2 transition-colors ${
              selectedOption === option.value
                ? "border-primary bg-primary/10"
                : "border-muted bg-background"
            }`}
            onClick={() => setSelectedOption(option.value)}
            disabled={isLoading}
          >
            <Image src={option.icon} alt={option.label} width={24} height={24} />
            <span>{option.label}</span>
          </Button>
        ))}
      </div>

      {selectedOption === "card" && (
        <div className="mb-4 flex flex-wrap gap-3 justify-center">
          {paymentOptions
            .find((opt) => opt.value === "card")!
            .brands!.map((brand) => (
              <Button
                key={brand.value}
                type="button"
                className={`flex items-center gap-2 border rounded-lg px-4 py-2 transition-colors ${
                  selectedCardBrand === brand.value
                    ? "border-primary bg-primary/10"
                    : "border-muted bg-background"
                }`}
                onClick={() => setSelectedCardBrand(brand.value)}
                disabled={isLoading}
              >
                <Image src={brand.icon} alt={brand.label} width={24} height={24} />
                <span>{brand.label}</span>
              </Button>
            ))}
        </div>
      )}

      <Button onClick={handlePayment} disabled={isLoading} className="w-full flex items-center justify-center gap-2">
        {isLoading ? (
          "Processing..."
        ) : (
          <>
            <Image
              src="/edulearn-logo.png"
              alt="LMS Logo"
              className="h-5 w-5"
              width={20}
              height={20}
              style={{ display: "inline" }}
            />
            Pay ₹{price} ({selectedOption === "card"
              ? paymentOptions.find(opt => opt.value === "card")!.brands!.find(b => b.value === selectedCardBrand)?.label
              : paymentOptions.find(opt => opt.value === selectedOption)?.label
            })
          </>
        )}
      </Button>
    </div>
  )
}