"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { refundSchema } from "@/models/refund";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard, AlertCircle } from "lucide-react";
import Link from "next/link";

type RefundFormType = z.infer<typeof refundSchema>;

export default function RefundPage() {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const courseName = searchParams.get("courseName");
  const price = searchParams.get("price");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<RefundFormType>({
    resolver: zodResolver(refundSchema),
    defaultValues: {
      refundReasonCategory: "other",
      refundMethod: "original",
    },
  });

  // Check if user is enrolled in the course
  useEffect(() => {
    if (courseId) {
      fetch(`/api/courses/${courseId}/enroll`)
        .then(res => res.json())
        .then(data => {
          setIsEnrolled(data.isEnrolled || false);
          setLoading(false);
        })
        .catch(() => {
          setIsEnrolled(false);
          setLoading(false);
        });
    }
  }, [courseId]);

  // Set course and price from URL params
  useEffect(() => {
    if (courseId && price) {
      setValue("course", courseId);
      setValue("amount", parseFloat(price));
    }
  }, [courseId, price, setValue]);

  const onSubmit = async (data: RefundFormType) => {
    setSuccess(null);
    setError(null);
    
    try {
      const res = await fetch("/api/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          courseId,
          price: parseFloat(price || "0"),
        }),
      });
      
      const result = await res.json();
      
      if (res.ok) {
        setSuccess("Refund request submitted successfully. We will process your request within 5-7 business days.");
        reset();
      } else {
        setError(result.error || "Failed to submit refund request.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!courseId || !courseName || !price) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Request</h2>
            <p className="text-muted-foreground mb-4">
              Missing required course information. Please access this page from the course enrollment section.
            </p>
            <Link href="/courses">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Courses
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isEnrolled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Not Enrolled</h2>
            <p className="text-muted-foreground mb-4">
              You are not enrolled in this course. Only enrolled students can request refunds.
            </p>
            <Link href={`/courses/${courseId}`}>
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Course
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
            href={`/courses/${courseId}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Request a Refund</h1>
          <p className="mt-2 text-muted-foreground">
            We&apos;re sorry to see you go. Please fill out the form below to request a refund.
          </p>
        </div>

        {/* Course Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Course Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Course Name</Label>
                <p className="text-sm font-semibold">{decodeURIComponent(courseName)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Price Paid</Label>
                <p className="text-sm font-semibold">₹{price}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Refund Form */}
        <Card>
          <CardHeader>
            <CardTitle>Refund Details</CardTitle>
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
                  Copy the payment ID from your payment successful email or SMS
                </p>
                {errors.razorpayPaymentId && (
                  <p className="text-red-500 text-xs mt-1">{errors.razorpayPaymentId.message}</p>
                )}
              </div>

              {/* Reason */}
              <div>
                <Label htmlFor="reason">Reason for Refund</Label>
                <Textarea 
                  id="reason" 
                  {...register("reason")} 
                  placeholder="Please describe why you want a refund..."
                  className="mt-1"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional: Help us understand how we can improve
                </p>
                {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message}</p>}
              </div>

              {/* Refund Reason Category */}
              <div>
                <Label htmlFor="refundReasonCategory">
                  Refund Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  defaultValue="other"
                  onValueChange={value => setValue("refundReasonCategory", value as RefundFormType["refundReasonCategory"])}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select reason category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="duplicate">Duplicate Payment</SelectItem>
                    <SelectItem value="not_as_described">Course Not as Described</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.refundReasonCategory && (
                  <p className="text-red-500 text-xs mt-1">{errors.refundReasonCategory.message}</p>
                )}
              </div>

              {/* Refund Method */}
              <div>
                <Label htmlFor="refundMethod">
                  Refund Method <span className="text-red-500">*</span>
                </Label>
                <Select
                  defaultValue="original"
                  onValueChange={value => setValue("refundMethod", value as RefundFormType["refundMethod"])}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select refund method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Original Payment Method</SelectItem>
                    <SelectItem value="manual">Manual Bank Transfer</SelectItem>
                    <SelectItem value="wallet">Wallet Credit</SelectItem>
                  </SelectContent>
                </Select>
                {errors.refundMethod && (
                  <p className="text-red-500 text-xs mt-1">{errors.refundMethod.message}</p>
                )}
              </div>

              {/* Attachments */}
              <div>
                <Label htmlFor="attachments">Supporting Documents (Optional)</Label>
                <Input 
                  id="attachments" 
                  {...register("attachments.0")} 
                  placeholder="https://example.com/screenshot.png"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload any supporting documents (screenshots, receipts) and paste the URL here
                </p>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
                size="lg"
              >
                {isSubmitting ? "Submitting Request..." : "Submit Refund Request"}
              </Button>

              {/* Policy Note */}
              <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded-lg">
                <p className="font-medium mb-1">Refund Policy:</p>
                <ul className="space-y-1">
                  <li>• Refunds are processed within 5-7 business days</li>
                  <li>• 30-day money-back guarantee applies</li>
                  <li>• Refunds are subject to our terms and conditions</li>
                </ul>
              </div>

              {/* Success/Error Alerts */}
              {success && (
                <Alert variant="default">
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}