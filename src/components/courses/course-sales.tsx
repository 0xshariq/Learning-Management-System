"use client";

import { Marquee } from "@/components/magicui/marquee";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface SaleData {
  _id: string;
  amount: number;
  saleTime: string;
  expiryTime?: string;
  notes?: string;
}

interface SaleMarqueeProps {
  sale: SaleData | null;
  price: number;
}

export function SaleMarquee({ sale }: SaleMarqueeProps) {
  if (!sale) return null;
  return (
    <div className="my-6 mt-0 pt-0">
      <Marquee className="bg-gradient-to-r from-primary/80 to-secondary/80 rounded-lg py-2 px-4 text-white font-semibold text-lg">
        🎉 Limited Time Sale! Get this course for just ₹{sale.amount}
      </Marquee>
    </div>
  );
}

interface SalePriceBlockProps {
  sale: SaleData | null;
  price: number;
}

export function SalePriceBlock({ sale, price }: SalePriceBlockProps) {
  if (!sale) return null;
  return (
    <div className="flex flex-col items-start mb-2">
      <span className="text-3xl font-bold text-primary">₹{sale.amount}</span>
      <span className="text-lg text-muted-foreground line-through mt-1">₹{price}</span>
    </div>
  );
}

interface SaleTimerProps {
  expiryTime?: string;
}

export function SaleTimer({ expiryTime }: SaleTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!expiryTime) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(expiryTime).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft("Sale ended");
        clearInterval(interval);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(
        `${days > 0 ? `${days}d ` : ""}${hours}h ${minutes}m ${seconds}s left`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [expiryTime]);

  if (!expiryTime) return null;
  return (
    <div className="mt-2 flex items-center">
      <Clock className="inline-block w-4 h-4 mr-1 text-red-500" />
      <span className="text-sm text-red-500 font-semibold">{timeLeft}</span>
    </div>
  );
}