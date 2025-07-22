import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import TeacherLiveClassDashboard from "@/components/teacher/live-class-dashboard";

export default async function TeacherLiveClassesPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "teacher") {
    redirect("/role");
  }

  return <TeacherLiveClassDashboard />;
}

export const metadata = {
  title: "Live Classes - Teacher Dashboard",
  description: "Manage your live streaming sessions"
}
