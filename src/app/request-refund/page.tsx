import { Suspense } from "react";
import RequestRefundPage from "./request-refund";

export default function StudentSignIn() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12">Loading...</div>}>
      <RequestRefundPage />
    </Suspense>
  );
}