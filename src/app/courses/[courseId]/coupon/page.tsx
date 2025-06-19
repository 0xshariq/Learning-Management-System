"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { couponSchema } from "@/models/coupon"; // Zod schema

interface Coupon {
  code: string;
  discountPercentage?: number;
  discountAmount?: number;
  expiresAt: string;
}

interface CouponForm {
  code: string;
  discountType: "percentage" | "amount";
  discountPercentage: string;
  discountAmount: string;
  expiresAt: string;
}

export default function CouponPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [form, setForm] = useState<CouponForm>({
    code: "",
    discountType: "percentage",
    discountPercentage: "",
    discountAmount: "",
    expiresAt: "",
  });
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/coupon`)
      .then((res) => res.json())
      .then((data) => setCoupon(data.coupon as Coupon));
  }, [courseId]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? value : value,
    }));
  };

  const handleDiscountTypeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      discountType: e.target.value as "percentage" | "amount",
      discountPercentage: "",
      discountAmount: "",
    }));
  };

  const getPayload = () => {
    const payload: {
      code: string;
      expiresAt: string;
      course: string;
      discountPercentage?: number;
      discountAmount?: number;
    } = {
      code: form.code,
      expiresAt: form.expiresAt,
      course: courseId,
    };
    if (form.discountType === "percentage") {
      payload.discountPercentage = Number(form.discountPercentage);
    } else if (form.discountType === "amount") {
      payload.discountAmount = Number(form.discountAmount);
    }
    return payload;
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    const payload = getPayload();

    // Validate with Zod schema before sending
    const parsed = couponSchema.safeParse(payload);
    if (!parsed.success) {
      setFormError(parsed.error.errors[0]?.message || "Invalid data");
      setLoading(false);
      return;
    }

    const res = await fetch(`/api/courses/${courseId}/coupon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setCoupon(data.coupon as Coupon);
      setForm({
        code: "",
        discountType: "percentage",
        discountPercentage: "",
        discountAmount: "",
        expiresAt: "",
      });
    } else {
      setFormError(data.error || "Failed to create coupon");
    }
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    const payload = getPayload();

    // Validate with Zod schema before sending
    const parsed = couponSchema.safeParse(payload);
    if (!parsed.success) {
      setFormError(parsed.error.errors[0]?.message || "Invalid data");
      setLoading(false);
      return;
    }

    const res = await fetch(`/api/courses/${courseId}/coupon/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setCoupon(data.coupon as Coupon);
      setForm({
        code: "",
        discountType: "percentage",
        discountPercentage: "",
        discountAmount: "",
        expiresAt: "",
      });
    } else {
      setFormError(data.error || "Failed to update coupon");
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Manage Coupon</h1>
      {coupon ? (
        <div className="mb-6 p-4 border rounded">
          <div>
            Code: <b>{coupon.code}</b>
          </div>
          {coupon.discountPercentage !== undefined && (
            <div>Discount: {coupon.discountPercentage}%</div>
          )}
          {coupon.discountAmount !== undefined && (
            <div>Discount: ₹{coupon.discountAmount}</div>
          )}
          <div>
            Expires At: {new Date(coupon.expiresAt).toLocaleString()}
          </div>
        </div>
      ) : (
        <div className="mb-6 text-muted-foreground">
          No coupon for this course.
        </div>
      )}
      <form className="space-y-3">
        <Input
          name="code"
          value={form.code}
          onChange={handleChange}
          placeholder="Coupon Code"
          required
        />
        <div className="flex items-center gap-4">
          <Label className="flex items-center gap-1">
            <Input
              type="radio"
              name="discountType"
              value="percentage"
              checked={form.discountType === "percentage"}
              onChange={handleDiscountTypeChange}
            />
            Percentage (%)
          </Label>
          <Label className="flex items-center gap-1">
            <Input
              type="radio"
              name="discountType"
              value="amount"
              checked={form.discountType === "amount"}
              onChange={handleDiscountTypeChange}
            />
            Direct Amount (₹)
          </Label>
        </div>
        {form.discountType === "percentage" && (
          <Input
            name="discountPercentage"
            type="number"
            value={form.discountPercentage}
            onChange={handleChange}
            placeholder="Discount (%)"
            min={1}
            max={100}
            required
          />
        )}
        {form.discountType === "amount" && (
          <Input
            name="discountAmount"
            type="number"
            value={form.discountAmount}
            onChange={handleChange}
            placeholder="Discount Amount (₹)"
            min={1}
            required
          />
        )}
        <Input
          name="expiresAt"
          type="datetime-local"
          value={form.expiresAt}
          onChange={handleChange}
          placeholder="Expires At"
          required
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={loading} onClick={handleCreate}>
            {loading ? "Saving..." : "Create Coupon"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={handleUpdate}
          >
            {loading ? "Saving..." : "Update Coupon"}
          </Button>
        </div>
        {formError && <div className="text-red-500">{formError}</div>}
      </form>
    </div>
  );
}