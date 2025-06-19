"use client";

import { Marquee } from "@/components/magicui/marquee";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface SaleData {
  _id: string;
  amount: number;
  saleTime: string;
  expiryTime?: string;
}

interface CourseSalesProps {
  sale: SaleData | null;
  price: number;
  sidebar?: boolean;
}

function SaleTimer({ expiryTime }: { expiryTime?: string }) {
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
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s left`);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiryTime]);

  if (!expiryTime) return null;
  return (
    <span className="ml-2 text-sm text-red-500 font-semibold flex items-center">
      <Clock className="inline-block w-4 h-4 mr-1" />
      {timeLeft}
    </span>
  );
}

export default function CourseSales({ sale, price, sidebar }: CourseSalesProps) {
  if (!sale) return null;

  // Sidebar style: price only, no Marquee
  if (sidebar) {
    return (
      <div className="mb-4 flex flex-col items-center">
        <span className="text-lg text-muted-foreground line-through">
          ₹{price}
        </span>
        <span className="text-3xl font-bold text-primary">
          ₹{sale.amount}
        </span>
        {sale.expiryTime && <SaleTimer expiryTime={sale.expiryTime} />}
      </div>
    );
  }

  // Main content style: Marquee
  return (
    <div className="my-6">
      <Marquee className="bg-gradient-to-r from-primary/80 to-secondary/80 rounded-lg py-2 px-4 text-white font-semibold text-lg">
        🎉 Limited Time Sale! Get this course for just ₹{sale.amount}
        {sale.expiryTime && <SaleTimer expiryTime={sale.expiryTime} />}
        <span className="ml-4 line-through text-gray-300">₹{price}</span>
      </Marquee>
    </div>
  );
}