"use client";

import { useState, useEffect } from "react";
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

type RefundFormType = z.infer<typeof refundSchema>;

type Course = {
  _id: string;
  name: string;
  price: number;
};

type Payment = {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  amount: number;
};

export default function RefundPage() {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<string>("");
  const [coursePrice, setCoursePrice] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<RefundFormType>({
    resolver: zodResolver(refundSchema),
    defaultValues: {
      refundReasonCategory: "other",
      refundMethod: "original",
    },
  });

  // Fetch user's enrolled courses
  useEffect(() => {
    // Replace with your real API endpoint
    fetch("/api/my-courses")
      .then(res => res.json())
      .then(data => setCourses(data.courses || []));
  }, []);

  // Fetch payments for selected course
  useEffect(() => {
    if (selectedCourse) {
      // Replace with your real API endpoint
      fetch(`/api/my-payments?courseId=${selectedCourse}`)
        .then(res => res.json())
        .then(data => setPayments(data.payments || []));
      // Set course price
      const course = courses.find(c => c._id === selectedCourse);
      setCoursePrice(course ? course.price : null);
      setValue("course", selectedCourse);
    }
  }, [selectedCourse, courses, setValue]);

  // Set payment fields when payment is selected
  useEffect(() => {
    if (selectedPayment) {
      const payment = payments.find(p => p.razorpayPaymentId === selectedPayment);
      if (payment) {
        setValue("razorpayPaymentId", payment.razorpayPaymentId);
        setValue("razorpayOrderId", payment.razorpayOrderId);
        setValue("amount", payment.amount);
      }
    }
  }, [selectedPayment, payments, setValue]);

  const onSubmit = async (data: RefundFormType) => {
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch("/api/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) {
        setSuccess("Refund request submitted successfully.");
        reset();
        setSelectedCourse("");
        setSelectedPayment("");
        setCoursePrice(null);
      } else {
        setError(result.error || "Failed to submit refund request.");
      }
    } catch (err) {
      setError("Something went wrong.");
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Request a Refund</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card p-6 rounded-lg border">
        {/* Course Select */}
        <div>
          <Label htmlFor="course">Course</Label>
          <Select
            value={selectedCourse}
            onValueChange={value => setSelectedCourse(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map(course => (
                <SelectItem key={course._id} value={course._id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.course && <p className="text-red-500 text-xs mt-1">{errors.course.message}</p>}
        </div>
        {/* Show course price */}
        {coursePrice !== null && (
          <div>
            <Label>Course Price</Label>
            <div className="border rounded px-3 py-2 bg-muted">{coursePrice} INR</div>
          </div>
        )}
        {/* Payment Select */}
        <div>
          <Label htmlFor="razorpayPaymentId">Payment</Label>
          <Select
            value={selectedPayment}
            onValueChange={value => setSelectedPayment(value)}
            disabled={!selectedCourse}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select payment" />
            </SelectTrigger>
            <SelectContent>
              {payments.map(payment => (
                <SelectItem key={payment.razorpayPaymentId} value={payment.razorpayPaymentId}>
                  {payment.razorpayPaymentId} ({payment.amount} INR)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.razorpayPaymentId && (
            <p className="text-red-500 text-xs mt-1">{errors.razorpayPaymentId.message}</p>
          )}
        </div>
        {/* Razorpay Order ID (readonly) */}
        <div>
          <Label htmlFor="razorpayOrderId">Razorpay Order ID</Label>
          <Input
            id="razorpayOrderId"
            {...register("razorpayOrderId")}
            placeholder="e.g. order_xxxxx"
            readOnly
          />
          {errors.razorpayOrderId && (
            <p className="text-red-500 text-xs mt-1">{errors.razorpayOrderId.message}</p>
          )}
        </div>
        {/* Amount (readonly) */}
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            {...register("amount", { valueAsNumber: true })}
            placeholder="Refund Amount"
            readOnly
          />
          {errors.amount && (
            <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
          )}
        </div>
        {/* Reason */}
        <div>
          <Label htmlFor="reason">Reason (optional)</Label>
          <Textarea id="reason" {...register("reason")} placeholder="Describe your reason (optional)" />
          {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message}</p>}
        </div>
        {/* Refund Reason Category */}
        <div>
          <Label htmlFor="refundReasonCategory">Refund Reason Category</Label>
          <Select
            defaultValue="other"
            onValueChange={value => setValue("refundReasonCategory", value as RefundFormType["refundReasonCategory"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="duplicate">Duplicate Payment</SelectItem>
              <SelectItem value="not_as_described">Not as Described</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.refundReasonCategory && (
            <p className="text-red-500 text-xs mt-1">{errors.refundReasonCategory.message}</p>
          )}
        </div>
        {/* Refund Method */}
        <div>
          <Label htmlFor="refundMethod">Refund Method</Label>
          <Select
            defaultValue="original"
            onValueChange={value => setValue("refundMethod", value as RefundFormType["refundMethod"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="original">Original</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="wallet">Wallet</SelectItem>
            </SelectContent>
          </Select>
          {errors.refundMethod && (
            <p className="text-red-500 text-xs mt-1">{errors.refundMethod.message}</p>
          )}
        </div>
        {/* Attachments */}
        <div>
          <Label htmlFor="attachments">Attachments (URLs, optional)</Label>
          <Input id="attachments" {...register("attachments.0")} placeholder="Attachment URL (optional)" />
        </div>
        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Refund Request"}
        </Button>
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
    </div>
  );
}