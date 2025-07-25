import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import TeacherReviewsComponent from "@/components/teacher/teacher-reviews";

export default async function TeacherReviewsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "teacher") {
    redirect("/role");
  }

  return <TeacherReviewsComponent />;
}

export const metadata = {
  title: "Course Reviews - Teacher Dashboard",
  description: "View and manage reviews for your courses"
};
