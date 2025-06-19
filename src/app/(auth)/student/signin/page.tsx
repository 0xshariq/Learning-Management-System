import { Suspense } from "react";
import StudentSignInPage from "./student-signin";

export default function StudentSignIn() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12">Loading...</div>}>
      <StudentSignInPage />
    </Suspense>
  );
}