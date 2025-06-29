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
import { ArrowLeft, CreditCard, AlertCircle, FileText, Shield, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type RequestRefundFormType = z.infer<typeof requestRefundSchema>;

export default function RequestRefundPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    watch,
    formState: { errors, isSubmitting }
  } = useForm<RequestRefundFormType>({
    resolver: zodResolver(requestRefundSchema),
    defaultValues: {
      refundReasonCategory: "other",
      requestStatus: "pending",
    },
  });

  const watchedCategory = watch("refundReasonCategory");

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
        setSuccess("Refund request submitted successfully. Your request will be reviewed by the course instructor within 24-48 hours.");
        reset();
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push("/student/dashboard");
        }, 3000);
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
              Missing required course information. Please access this page from your enrolled courses.
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
                <p className="text-sm font-semibold text-green-600">₹{price}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Process Info Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <FileText className="mr-2 h-5 w-5" />
              Refund Process Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold mr-3">1</div>
                <p className="text-blue-700">Submit your refund request with detailed reason</p>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-6 h-6 rounded-full bg-gray-300 text-white flex items-center justify-center text-xs font-bold mr-3">2</div>
                <p className="text-muted-foreground">Course instructor reviews your request (24-48 hours)</p>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-6 h-6 rounded-full bg-gray-300 text-white flex items-center justify-center text-xs font-bold mr-3">3</div>
                <p className="text-muted-foreground">If approved, refund is processed (5-7 business days)</p>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-6 h-6 rounded-full bg-gray-300 text-white flex items-center justify-center text-xs font-bold mr-3">4</div>
                <p className="text-muted-foreground">Email confirmation and refund completion</p>
              </div>
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

              {/* Refund Reason Category */}
              <div>
                <Label htmlFor="refundReasonCategory">
                  Refund Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watchedCategory}
                  onValueChange={value => setValue("refundReasonCategory", value as RequestRefundFormType["refundReasonCategory"])}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select reason category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="duplicate">
                      <div className="flex flex-col">
                        <span>Duplicate Payment</span>
                        <span className="text-xs text-muted-foreground">You were charged multiple times</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="not_as_described">
                      <div className="flex flex-col">
                        <span>Course Not as Described</span>
                        <span className="text-xs text-muted-foreground">Content differs from description</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="other">
                      <div className="flex flex-col">
                        <span>Other Reason</span>
                        <span className="text-xs text-muted-foreground">Specify in the reason field</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.refundReasonCategory && (
                  <p className="text-red-500 text-xs mt-1">{errors.refundReasonCategory.message}</p>
                )}
              </div>

              {/* Reason */}
              <div>
                <Label htmlFor="reason">
                  Detailed Reason for Refund <span className="text-red-500">*</span>
                </Label>
                <Textarea 
                  id="reason" 
                  {...register("reason")} 
                  placeholder={
                    watchedCategory === "duplicate" 
                      ? "Please describe the duplicate payment issue..."
                      : watchedCategory === "not_as_described"
                      ? "Please explain how the course differs from what was described..."
                      : "Please provide a detailed explanation for your refund request..."
                  }
                  className="mt-1"
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Be specific and detailed to help the instructor understand your situation
                </p>
                {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message}</p>}
              </div>

              {/* Additional Notes */}
              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea 
                  id="notes" 
                  {...register("notes")} 
                  placeholder="Any additional context, special circumstances, or information..."
                  className="mt-1"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional: Provide any additional context that might help with your request
                </p>
                {errors.notes && <p className="text-red-500 text-xs mt-1">{errors.notes.message}</p>}
              </div>

              {/* Attachments */}
              <div>
                <Label htmlFor="attachments">Supporting Documents (Optional)</Label>
                <Input 
                  id="attachments" 
                  {...register("attachments.0")} 
                  placeholder="https://example.com/screenshot.png or https://drive.google.com/..."
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload screenshots, receipts, or other supporting documents and paste the public URL here
                </p>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Submit Refund Request
                  </>
                )}
              </Button>

              {/* Policy Note */}
              <div className="text-xs text-muted-foreground bg-gray-50 p-4 rounded-lg">
                <p className="font-medium mb-2">Important Guidelines:</p>
                <ul className="space-y-1">
                  <li>• Refund requests are reviewed by the course instructor</li>
                  <li>• Each course may have different refund policies</li>
                  <li>• Requests are typically reviewed within 24-48 hours</li>
                  <li>• You will receive email notifications about status updates</li>
                  <li>• If approved, processing time varies by payment method</li>
                  <li>• Be honest and detailed in your explanation</li>
                </ul>
              </div>

              {/* Success/Error Alerts */}
              {success && (
                <Alert variant="default" className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Request Submitted Successfully!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    {success} You will be redirected to your dashboard shortly.
                  </AlertDescription>
                </Alert>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Submission Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-3">Need Help?</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Can't find course details?</strong> Go to your dashboard and access the refund option from there</p>
              <p>• <strong>Technical issues?</strong> Contact our support team for assistance</p>
              <p>• <strong>Questions about refund policy?</strong> Check the course page for specific policies</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}