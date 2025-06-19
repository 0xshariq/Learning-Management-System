"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { paymentValidationSchema } from "@/models/payment";
import { Input } from "@/components/ui/input";
import { ConfettiButton } from "@/components/magicui/confetti";

type RazorpayHandlerResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay: {
      new (options: object): { open: () => void };
    };
  }
}

const paymentOptions = [
  {
    value: "upi",
    label: "UPI / Google Pay",
  },
  {
    value: "card",
    label: "Credit/Debit Card",
    brands: [
      { value: "visa", label: "Visa" },
      { value: "mastercard", label: "MasterCard" },
      { value: "rupay", label: "RuPay" },
      { value: "amex", label: "Amex" },
    ],
  },
  {
    value: "netbanking",
    label: "Netbanking",
  },
  {
    value: "wallet",
    label: "Wallet",
  },
];

export default function PaymentCheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const courseId = searchParams.get("courseId") || "";
  const courseName = searchParams.get("courseName") || "";
  const price = Number(searchParams.get("price") || 0);

  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState("upi");
  const [selectedCardBrand, setSelectedCardBrand] = useState("visa");

  // Coupon logic
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [finalPrice, setFinalPrice] = useState<number>(price);

  useEffect(() => {
    setFinalPrice(price);
  }, [price]);

  useEffect(() => {
    if (!courseId || !courseName || !price) {
      toast({
        title: "Invalid Payment Link",
        description: "Missing course information. Please try again.",
        variant: "destructive",
      });
      router.push("/");
    }
    // eslint-disable-next-line
  }, []);

  // Coupon apply handler (fetches calculated price from API)
  const handleApplyCoupon = async () => {
    setCouponError(null);
    setCouponApplied(false);
    setDiscount(0);
    setFinalPrice(price);

    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code.");
      return;
    }

    try {
      const res = await fetch(`/api/courses/${courseId}/coupon/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setCouponError(data.error || "Invalid coupon.");
        return;
      }

      setDiscount(data.discount || 0);
      setFinalPrice(data.finalPrice ?? price);
      setCouponApplied(true);
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : "Failed to apply coupon");
    }
  };

  // Remove coupon handler
  const handleRemoveCoupon = () => {
    setCouponApplied(false);
    setCouponCode("");
    setCouponError(null);
    setDiscount(0);
    setFinalPrice(price);
  };

  // Payment handler
  const handlePayment = async () => {
    setIsLoading(true);
    try {
      if (!window.Razorpay) {
        await loadRazorpayScript();
      }

      // Validate payment data using the schema (optional, for frontend safety)
      const validation = paymentValidationSchema
        .omit({
          student: true,
          course: true,
          amount: true,
          razorpayPaymentId: true,
          status: true,
        })
        .extend({
          courseId: paymentValidationSchema.shape.course,
        })
        .safeParse({
          courseId,
          paymentOption: selectedOption,
          cardBrand: selectedOption === "card" ? selectedCardBrand : undefined,
        });

      if (!validation.success) {
        toast({
          title: "Invalid Payment Data",
          description: "Please select a valid payment option.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
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
          amount: finalPrice, // send discounted price if coupon applied
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment order");
      }

      const data = await response.json();

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
                cardBrand:
                  selectedOption === "card" ? selectedCardBrand : undefined,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error("Payment verification failed");
            }

            toast({
              title: "Payment Successful",
              description: "You have successfully enrolled in the course",
            });

            router.push(`/courses/${courseId}`);
            router.refresh();
          } catch (error) {
            toast({
              title: "Payment Error",
              description:
                error instanceof Error
                  ? error.message
                  : "An error occurred during payment verification",
              variant: "destructive",
            });
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
            setIsLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast({
        title: "Payment Error",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred while processing the payment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise<void>((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  };

  return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center py-10 relative">
      <div className="w-full max-w-xl bg-[#181818] rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-8 text-center text-white">
          Checkout for {courseName}
        </h2>
        {/* Coupon UI */}
        <div className="mb-6 flex gap-2 items-center">
          <Input
            placeholder="Enter coupon code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            className="flex-1"
            disabled={couponApplied}
          />
          <ConfettiButton
            asChild
            disabled={couponApplied}
            onClick={handleApplyCoupon}
          >
            <Button type="button" variant="secondary" disabled={couponApplied}>
              Apply Coupon
            </Button>
          </ConfettiButton>
          {couponApplied && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemoveCoupon}
              className="ml-2"
            >
              Remove Coupon
            </Button>
          )}
        </div>
        {couponError && (
          <div className="mb-4 text-red-500 text-sm">{couponError}</div>
        )}
        {/* Price display */}
        <div className="mb-8">
          {couponApplied ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-green-400">
                ₹{finalPrice}
              </span>
              <span className="text-lg text-gray-400 line-through">
                ₹{price}
              </span>
              <span className="text-green-500 text-sm">
                Coupon applied! Discount: ₹{discount}
              </span>
            </div>
          ) : (
            <div className="text-2xl font-bold text-white text-center">
              ₹{price}
            </div>
          )}
        </div>
        {/* Payment options */}
        <div className="mb-8 flex flex-wrap gap-4 justify-center">
          {paymentOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              className={`flex items-center gap-2 border-2 rounded-lg px-6 py-3 font-semibold text-lg transition-colors
                ${
                  selectedOption === option.value
                    ? "border-primary bg-primary/20 text-white"
                    : "border-gray-700 bg-[#222] text-gray-300 hover:border-primary hover:text-white"
                }`}
              onClick={() => setSelectedOption(option.value)}
              disabled={isLoading}
              style={{ minWidth: 180 }}
            >
              <span>{option.label}</span>
            </Button>
          ))}
        </div>

        {selectedOption === "card" && (
          <div className="mb-8 flex flex-wrap gap-4 justify-center">
            {paymentOptions
              .find((opt) => opt.value === "card")!
              .brands!.map((brand) => (
                <button
                  key={brand.value}
                  type="button"
                  className={`flex items-center gap-2 border-2 rounded-lg px-5 py-2 font-medium text-base transition-colors
                    ${
                      selectedCardBrand === brand.value
                        ? "border-primary bg-primary/20 text-white"
                        : "border-gray-700 bg-[#222] text-gray-300 hover:border-primary hover:text-white"
                    }`}
                  onClick={() => setSelectedCardBrand(brand.value)}
                  disabled={isLoading}
                  style={{ minWidth: 120 }}
                >
                  <span>{brand.label}</span>
                </button>
              ))}
          </div>
        )}

        <Button
          onClick={handlePayment}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 text-lg font-semibold py-6 bg-[#ccc] text-black hover:bg-[#bbb]"
        >
          {isLoading ? (
            "Processing..."
          ) : (
            <>
              <Image
                src="/edulearn-logo.png"
                alt="LMS Logo"
                className="h-6 w-6"
                width={24}
                height={24}
              />
              <span>
                Pay ₹{finalPrice} (
                {selectedOption === "card"
                  ? paymentOptions
                      .find((opt) => opt.value === "card")!
                      .brands!.find((b) => b.value === selectedCardBrand)?.label
                  : paymentOptions.find((opt) => opt.value === selectedOption)
                      ?.label}
                )
              </span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
