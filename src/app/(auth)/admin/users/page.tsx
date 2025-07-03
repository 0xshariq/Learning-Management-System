"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UserCircle,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  MoreHorizontal,
  Mail,
  UserX,
  UserCheck,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface AdminType {
  _id: { toString(): string };
  name: string;
  email: string;
  createdAt: string | number | Date;
  isActive?: boolean;
}

interface StudentType {
  _id: { toString(): string };
  name: string;
  email: string;
  createdAt: string | number | Date;
  purchasedCourses?: string[];
  isActive?: boolean;
}

interface TeacherType {
  _id: { toString(): string };
  name: string;
  email: string;
  createdAt: string | number | Date;
  coursesCreated?: string[];
  isActive?: boolean;
}

interface AdminUsersPageProps {
  students: StudentType[];
  teachers: TeacherType[];
  admins: AdminType[];
}

export default function AdminUsersPage({
  students: initialStudents,
  teachers: initialTeachers,
  admins: initialAdmins,
}: AdminUsersPageProps) {
  const [students, setStudents] = useState(initialStudents);
  const [teachers, setTeachers] = useState(initialTeachers);
  const [admins, setAdmins] = useState(initialAdmins);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [suspendDialog, setSuspendDialog] = useState<{
    open: boolean;
    userId: string;
    userType: string;
    userName: string;
    currentStatus: boolean;
  }>({
    open: false,
    userId: "",
    userType: "",
    userName: "",
    currentStatus: true,
  });

  const router = useRouter();

  const handleSuspendAccount = async () => {
    setLoading(suspendDialog.userId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/users/${suspendDialog.userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: suspendDialog.currentStatus ? "suspend" : "activate",
          userType: suspendDialog.userType,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const newStatus = !suspendDialog.currentStatus;
        
        // Update local state based on user type
        if (suspendDialog.userType === "student") {
          setStudents(prev =>
            prev.map(student =>
              student._id.toString() === suspendDialog.userId
                ? { ...student, isActive: newStatus }
                : student
            )
          );
        } else if (suspendDialog.userType === "teacher") {
          setTeachers(prev =>
            prev.map(teacher =>
              teacher._id.toString() === suspendDialog.userId
                ? { ...teacher, isActive: newStatus }
                : teacher
            )
          );
        } else if (suspendDialog.userType === "admin") {
          setAdmins(prev =>
            prev.map(admin =>
              admin._id.toString() === suspendDialog.userId
                ? { ...admin, isActive: newStatus }
                : admin
            )
          );
        }

        setSuccess(
          `${suspendDialog.userName} has been ${
            newStatus ? "activated" : "suspended"
          } successfully.`
        );
        setSuspendDialog({ open: false, userId: "", userType: "", userName: "", currentStatus: true });
      } else {
        throw new Error(result.error || "Failed to update user status");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  const handleViewProfile = (userId: string, userType: string) => {
    router.push(`/admin/users/${userId}?type=${userType}`);
  };

  const handleViewCourses = (teacherId: string) => {
    router.push(`/teacher/courses?teacherId=${teacherId}&adminView=true`);
  };

  const handleEmailUser = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const openSuspendDialog = (
    userId: string,
    userType: string,
    userName: string,
    currentStatus: boolean
  ) => {
    setSuspendDialog({
      open: true,
      userId,
      userType,
      userName,
      currentStatus,
    });
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="students" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Students ({students.length})
          </TabsTrigger>
          <TabsTrigger value="teachers" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Teachers ({teachers.length})
          </TabsTrigger>
          <TabsTrigger value="admins" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Admins ({admins.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription>
                Manage student accounts and enrollments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student: StudentType) => (
                    <TableRow key={student._id.toString()}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                        {student.name}
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={student.isActive !== false ? "default" : "secondary"}
                          className={
                            student.isActive !== false
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {student.isActive !== false ? "Active" : "Suspended"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(student.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {student.purchasedCourses?.length || 0}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleEmailUser(student.email)}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              <span>Email Student</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleViewProfile(student._id.toString(), "student")}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className={
                                student.isActive !== false
                                  ? "text-destructive"
                                  : "text-green-600"
                              }
                              onClick={() =>
                                openSuspendDialog(
                                  student._id.toString(),
                                  "student",
                                  student.name,
                                  student.isActive !== false
                                )
                              }
                              disabled={loading === student._id.toString()}
                            >
                              {student.isActive !== false ? (
                                <UserX className="mr-2 h-4 w-4" />
                              ) : (
                                <UserCheck className="mr-2 h-4 w-4" />
                              )}
                              <span>
                                {loading === student._id.toString()
                                  ? "Processing..."
                                  : student.isActive !== false
                                  ? "Suspend Account"
                                  : "Activate Account"}
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers">
          <Card>
            <CardHeader>
              <CardTitle>Teachers</CardTitle>
              <CardDescription>
                Manage teacher accounts and courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher: TeacherType) => (
                    <TableRow key={teacher._id.toString()}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                        {teacher.name}
                      </TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={teacher.isActive !== false ? "default" : "secondary"}
                          className={
                            teacher.isActive !== false
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {teacher.isActive !== false ? "Active" : "Suspended"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(teacher.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {teacher.coursesCreated?.length || 0}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleEmailUser(teacher.email)}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              <span>Email Teacher</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleViewProfile(teacher._id.toString(), "teacher")}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleViewCourses(teacher._id.toString())}
                            >
                              <BookOpen className="mr-2 h-4 w-4" />
                              <span>View Courses</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className={
                                teacher.isActive !== false
                                  ? "text-destructive"
                                  : "text-green-600"
                              }
                              onClick={() =>
                                openSuspendDialog(
                                  teacher._id.toString(),
                                  "teacher",
                                  teacher.name,
                                  teacher.isActive !== false
                                )
                              }
                              disabled={loading === teacher._id.toString()}
                            >
                              {teacher.isActive !== false ? (
                                <UserX className="mr-2 h-4 w-4" />
                              ) : (
                                <UserCheck className="mr-2 h-4 w-4" />
                              )}
                              <span>
                                {loading === teacher._id.toString()
                                  ? "Processing..."
                                  : teacher.isActive !== false
                                  ? "Suspend Account"
                                  : "Activate Account"}
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <CardTitle>Administrators</CardTitle>
              <CardDescription>Manage admin accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin: AdminType) => (
                    <TableRow key={admin._id.toString()}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                        {admin.name}
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={admin.isActive !== false ? "default" : "secondary"}
                          className={
                            admin.isActive !== false
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {admin.isActive !== false ? "Active" : "Suspended"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleEmailUser(admin.email)}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              <span>Email Admin</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleViewProfile(admin._id.toString(), "admin")}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className={
                                admin.isActive !== false
                                  ? "text-destructive"
                                  : "text-green-600"
                              }
                              onClick={() =>
                                openSuspendDialog(
                                  admin._id.toString(),
                                  "admin",
                                  admin.name,
                                  admin.isActive !== false
                                )
                              }
                              disabled={loading === admin._id.toString()}
                            >
                              {admin.isActive !== false ? (
                                <UserX className="mr-2 h-4 w-4" />
                              ) : (
                                <UserCheck className="mr-2 h-4 w-4" />
                              )}
                              <span>
                                {loading === admin._id.toString()
                                  ? "Processing..."
                                  : admin.isActive !== false
                                  ? "Revoke Access"
                                  : "Restore Access"}
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suspend/Activate Confirmation Dialog */}
      <AlertDialog open={suspendDialog.open} onOpenChange={(open) => 
        setSuspendDialog(prev => ({ ...prev, open }))
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendDialog.currentStatus ? "Suspend Account" : "Activate Account"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {suspendDialog.currentStatus ? "suspend" : "activate"}{" "}
              <strong>{suspendDialog.userName}</strong>? This action will{" "}
              {suspendDialog.currentStatus
                ? "disable their access to the platform"
                : "restore their access to the platform"}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendAccount}
              className={
                suspendDialog.currentStatus
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {suspendDialog.currentStatus ? "Suspend" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}