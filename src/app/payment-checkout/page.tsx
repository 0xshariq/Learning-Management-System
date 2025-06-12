import { Suspense } from "react";
import PaymentCheckoutPage from "./razorpay-checkout";

export default function StudentSignIn() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12">Loading...</div>}>
      <PaymentCheckoutPage />
    </Suspense>
  );
}