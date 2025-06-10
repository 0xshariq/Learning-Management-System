import { Suspense } from "react";
import AdminSignIn from "./admin-signin";

export default function StudentSignIn() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12">Loading...</div>}>
      <AdminSignIn />
    </Suspense>
  );
}