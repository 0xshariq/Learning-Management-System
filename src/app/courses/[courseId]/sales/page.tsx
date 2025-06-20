"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function CreateSaleForm() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [saleTime, setSaleTime] = useState("");
  const [expiryTime, setExpiryTime] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation: expiryTime must be present and after saleTime
    if (!expiryTime) {
      setFormError("Expiry time is required.");
      return;
    }
    if (!saleTime) {
      setFormError("Sale start time is required.");
      return;
    }
    if (new Date(expiryTime) <= new Date(saleTime)) {
      setFormError("Expiry time must be after sale start time.");
      return;
    }

    setLoading(true);

    const payload = {
      amount: Number(amount),
      saleTime: new Date(saleTime).toISOString(),
      expiryTime: new Date(expiryTime).toISOString(),
      currency: currency || "INR",
      notes: notes || undefined,
    };

    const res = await fetch(`/api/courses/${courseId}/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      // Redirect to the course detail page after successful creation
      router.push(`/courses/${courseId}`);
    } else {
      setFormError(data.error || "Failed to create sale");
    }
  };

  return (
    <Card className="max-w-md mx-auto bg-[#181818] border border-[#232323] rounded-xl shadow-lg p-8 mt-8">
      <h2 className="text-2xl font-bold mb-6 text-white text-center">Create Sale for Course</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="amount" className="text-white">Sale Price (₹)</Label>
          <Input
            id="amount"
            type="number"
            min={1}
            name="amount"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
            className="mt-1 bg-[#222] border-[#333] text-white"
          />
        </div>
        <div>
          <Label htmlFor="saleTime" className="text-white">Sale Start Time</Label>
          <Input
            id="saleTime"
            type="datetime-local"
            name="saleTime"
            value={saleTime}
            onChange={e => setSaleTime(e.target.value)}
            required
            className="mt-1 bg-[#222] border-[#333] text-white"
          />
        </div>
        <div>
          <Label htmlFor="expiryTime" className="text-white">Sale Expiry Time</Label>
          <Input
            id="expiryTime"
            type="datetime-local"
            name="expiryTime"
            value={expiryTime}
            onChange={e => setExpiryTime(e.target.value)}
            required
            className="mt-1 bg-[#222] border-[#333] text-white"
          />
        </div>
        <div>
          <Label htmlFor="currency" className="text-white">Currency</Label>
          <Input
            id="currency"
            type="text"
            name="currency"
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="mt-1 bg-[#222] border-[#333] text-white"
          />
        </div>
        <div>
          <Label htmlFor="notes" className="text-white">Notes</Label>
          <Input
            id="notes"
            type="text"
            name="notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional notes"
            className="mt-1 bg-[#222] border-[#333] text-white"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary/90"
        >
          {loading ? "Creating..." : "Create Sale"}
        </Button>
        {formError && <div className="text-red-500 text-center">{formError}</div>}
      </form>
    </Card>
  );
}