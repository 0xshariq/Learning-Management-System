import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import StudentLiveClassList from "@/components/student/live-class-list";

export default async function StudentLiveClassesPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "student") {
    redirect("/role");
  }

  return <StudentLiveClassList />;
}

export const metadata = {
  title: "Live Classes - Student Dashboard",
  description: "Join live streaming sessions from your enrolled courses"
}
