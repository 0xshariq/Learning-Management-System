"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { refundSchema } from "@/models/refund";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard, AlertCircle, InfoIcon, CheckCircle } from "lucide-react";
import Link from "next/link";

// Create a form-specific schema without server-only fields
const refundFormSchema = z.object({
  razorpayPaymentId: z.string().min(1, "Razorpay Payment ID is required"),
  refundMethod: z.enum(["original", "manual", "wallet"]).default("original"),
});

type RefundFormType = z.infer<typeof refundFormSchema>;

export default function RefundPage() {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const courseName = searchParams.get("courseName");
  const price = searchParams.get("price");
  const studentId = searchParams.get("studentId");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<RefundFormType>({
    resolver: zodResolver(refundFormSchema),
    defaultValues: {
      refundMethod: "original",
    },
  });

  const watchedRefundMethod = watch("refundMethod");

  const onSubmit = async (data: RefundFormType) => {
    setSuccess(null);
    setError(null);
    setLoading(true);
    
    try {
      const res = await fetch("/api/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          studentId,
          amount: parseFloat(price || "0"),
          razorpayPaymentId: data.razorpayPaymentId,
          refundMethod: data.refundMethod,
        }),
      });
      
      const result = await res.json();
      
      if (res.ok) {
        setSuccess(`Refund processing initiated successfully! Refund ID: ${result.refundId}. The refund will be processed to your ${data.refundMethod === "original" ? "original payment method" : data.refundMethod === "manual" ? "bank account" : "wallet"} within 5-7 business days.`);
        reset();
      } else {
        setError(result.error || "Failed to process refund.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!courseId || !courseName || !price || !studentId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Request</h2>
            <p className="text-muted-foreground mb-4">
              Missing required course information. Please access this page from an approved refund request.
            </p>
            <Link href="/student/dashboard">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/student/dashboard"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Process Approved Refund</h1>
          <p className="mt-2 text-muted-foreground">
            Your refund request has been approved by the instructor. Please provide your payment details to process the refund.
          </p>
        </div>

        {/* Course Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Refund Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Course Name</Label>
                <p className="text-sm font-semibold">{decodeURIComponent(courseName)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Refund Amount</Label>
                <p className="text-sm font-semibold text-green-600">₹{price}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Notice */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <InfoIcon className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Important Notice</AlertTitle>
          <AlertDescription className="text-blue-700">
            Please provide your original Razorpay payment ID to process the refund. You can find this in your payment confirmation email or SMS from Razorpay.
          </AlertDescription>
        </Alert>

        {/* Refund Form */}
        <Card>
          <CardHeader>
            <CardTitle>Refund Processing Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Razorpay Payment ID */}
              <div>
                <Label htmlFor="razorpayPaymentId">
                  Razorpay Payment ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="razorpayPaymentId"
                  {...register("razorpayPaymentId")}
                  placeholder="e.g. pay_xxxxxxxxxxxxx"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the payment ID from your payment confirmation. It starts with "pay_" followed by alphanumeric characters.
                </p>
                {errors.razorpayPaymentId && (
                  <p className="text-red-500 text-xs mt-1">{errors.razorpayPaymentId.message}</p>
                )}
              </div>

              {/* Refund Method */}
              <div>
                <Label htmlFor="refundMethod">
                  Preferred Refund Method <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watchedRefundMethod}
                  onValueChange={value => setValue("refundMethod", value as RefundFormType["refundMethod"])}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select refund method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">
                      <div className="flex flex-col">
                        <span>Original Payment Method</span>
                        <span className="text-xs text-muted-foreground">Recommended - Fastest processing</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="manual">
                      <div className="flex flex-col">
                        <span>Manual Bank Transfer</span>
                        <span className="text-xs text-muted-foreground">Direct to your bank account</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="wallet">
                      <div className="flex flex-col">
                        <span>Wallet Credit</span>
                        <span className="text-xs text-muted-foreground">Add to your platform wallet</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {watchedRefundMethod === "original" && "Refund will be processed to the same payment method used for purchase"}
                  {watchedRefundMethod === "manual" && "You may be contacted for bank account details"}
                  {watchedRefundMethod === "wallet" && "Amount will be credited to your platform wallet for future purchases"}
                </p>
                {errors.refundMethod && (
                  <p className="text-red-500 text-xs mt-1">{errors.refundMethod.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || loading}
                size="lg"
              >
                {isSubmitting || loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing Refund...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Initiate Refund Processing
                  </>
                )}
              </Button>

              {/* Processing Information */}
              <div className="text-xs text-muted-foreground bg-gray-50 p-4 rounded-lg">
                <p className="font-medium mb-2">Refund Processing Timeline:</p>
                <ul className="space-y-1">
                  <li>• <strong>Original Payment Method:</strong> 3-5 business days</li>
                  <li>• <strong>Manual Bank Transfer:</strong> 5-7 business days</li>
                  <li>• <strong>Wallet Credit:</strong> Instant (available immediately)</li>
                  <li>• Bank processing times may add 2-3 additional business days</li>
                  <li>• You will receive email confirmation once refund is initiated</li>
                </ul>
              </div>

              {/* Success/Error Alerts */}
              {success && (
                <Alert variant="default" className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Refund Initiated Successfully!</AlertTitle>
                  <AlertDescription className="text-green-700">{success}</AlertDescription>
                </Alert>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Processing Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-3 flex items-center">
              <InfoIcon className="h-4 w-4 mr-2" />
              Need Help Finding Your Payment ID?
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-gray-700">Check your email:</p>
                <p>Look for an email from "Razorpay" or "noreply@razorpay.com" with subject containing "Payment Successful"</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Check your SMS:</p>
                <p>Look for SMS from Razorpay or your bank mentioning the payment ID</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Still can't find it?</p>
                <p>Contact our support team with your course name and approximate payment date</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Alert className="mt-6 border-gray-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Security Notice</AlertTitle>
          <AlertDescription>
            Never share your complete payment details with anyone. We only need the payment ID for refund processing.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}