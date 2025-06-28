"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { requestRefundSchema } from "@/models/request-refund";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard, AlertCircle, FileText, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type RequestRefundFormType = z.infer<typeof requestRefundSchema>;

export default function RequestRefundPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
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
    formState: { errors, isSubmitting }
  } = useForm<RequestRefundFormType>({
    resolver: zodResolver(requestRefundSchema),
    defaultValues: {
      refundReasonCategory: "other",
      requestStatus: "pending",
    },
  });

  // Check authentication and role
  useEffect(() => {
    if (session && session.user.role !== "student") {
      setError("Only students can request refunds.");
      setLoading(false);
      return;
    }

    if (session && studentId && session.user.id !== studentId) {
      setError("You can only request refunds for your own enrollments.");
      setLoading(false);
      return;
    }

    setLoading(false);
  }, [session, studentId]);



  // Set form values from URL params
  useEffect(() => {
    if (courseId && studentId && price) {
      setValue("courseId", courseId);
      setValue("studentId", studentId);
      setValue("amount", parseFloat(price));
    }
  }, [courseId, studentId, price, setValue]);

  const onSubmit = async (data: RequestRefundFormType) => {
    setSuccess(null);
    setError(null);
    
    try {
      const res = await fetch("/api/request-refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      const result = await res.json();
      
      if (res.ok) {
        setSuccess("Refund request submitted successfully. Your request will be reviewed by the course instructor.");
        reset();
      } else {
        setError(result.error || "Failed to submit refund request.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  };

  // Loading state
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

  // Check for missing parameters
  if (!courseId || !courseName || !price || !studentId) {
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

  // Check authentication
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to request a refund.
            </p>
            <Button onClick={() => router.push("/role")}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is a student
  if (session.user.role !== "student") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              Only students can request refunds for courses.
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

  // Check enrollment
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
          <h1 className="text-3xl font-bold text-gray-900">Request Refund</h1>
          <p className="mt-2 text-muted-foreground">
            Submit a refund request for review by the course instructor.
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
                <Label className="text-sm font-medium text-muted-foreground">Amount Paid</Label>
                <p className="text-sm font-semibold">₹{price}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Process Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Refund Process
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Your refund request will be reviewed by the course instructor</p>
              <p>• The instructor may accept or reject your request based on the course policy</p>
              <p>• If approved, the refund will be processed within 5-7 business days</p>
              <p>• You will receive an email notification about the status of your request</p>
            </div>
          </CardContent>
        </Card>

        {/* Refund Request Form */}
        <Card>
          <CardHeader>
            <CardTitle>Refund Request Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Hidden fields */}
              <input type="hidden" {...register("courseId")} />
              <input type="hidden" {...register("studentId")} />
              <input type="hidden" {...register("amount")} />

              {/* Reason */}
              <div>
                <Label htmlFor="reason">
                  Reason for Refund Request <span className="text-red-500">*</span>
                </Label>
                <Textarea 
                  id="reason" 
                  {...register("reason")} 
                  placeholder="Please explain why you want a refund..."
                  className="mt-1"
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Be specific about your reason to help the instructor make a decision
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
                  onValueChange={value => setValue("refundReasonCategory", value as RequestRefundFormType["refundReasonCategory"])}
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

              {/* Additional Notes */}
              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea 
                  id="notes" 
                  {...register("notes")} 
                  placeholder="Any additional information you'd like to provide..."
                  className="mt-1"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional: Provide any additional context or information
                </p>
                {errors.notes && <p className="text-red-500 text-xs mt-1">{errors.notes.message}</p>}
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
                <p className="font-medium mb-1">Important Notes:</p>
                <ul className="space-y-1">
                  <li>• Refund requests are subject to instructor approval</li>
                  <li>• Each course may have different refund policies</li>
                  <li>• Processing time may vary based on the payment method</li>
                  <li>• You will be notified via email about the status</li>
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