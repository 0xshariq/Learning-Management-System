import { Suspense } from "react";
import RefundPage from "./refund";

export default function StudentSignIn() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12">Loading...</div>}>
      <RefundPage />
    </Suspense>
  );
}