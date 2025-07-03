import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Student } from "@/models/student";
import { Teacher } from "@/models/teacher";
import { Admin } from "@/models/admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { action, userType } = await req.json();

    if (!["suspend", "activate"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!["student", "teacher", "admin"].includes(userType)) {
      return NextResponse.json({ error: "Invalid user type" }, { status: 400 });
    }

    const isActive = action === "activate";
    let updatedUser;

    switch (userType) {
      case "student":
        updatedUser = await Student.findByIdAndUpdate(
          id,
          { isActive },
          { new: true }
        );
        break;
      case "teacher":
        updatedUser = await Teacher.findByIdAndUpdate(
          id,
          { isActive },
          { new: true }
        );
        break;
      case "admin":
        updatedUser = await Admin.findByIdAndUpdate(
          id,
          { isActive },
          { new: true }
        );
        break;
    }

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: `User ${action}d successfully`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}