import { Suspense } from "react";
import TeacherSignInForm from "./teacher-signin";

export default function TeacherSignInPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12">Loading...</div>}>
      <TeacherSignInForm />
    </Suspense>
  );
}