import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { dbConnect } from "@/lib/dbConnect";
import { Student } from "@/models/student";
import { Teacher } from "@/models/teacher";
import { Admin } from "@/models/admin";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authOptions } from "@/lib/auth";

interface AdminType {
  _id: { toString(): string };
  name: string;
  email: string;
  createdAt: string | number | Date;
}
interface StudentType {
  _id: { toString(): string };
  name: string;
  email: string;
  createdAt: string | number | Date;
  purchasedCourses?: string[]; // Replace 'string' with a Course type if you have one
}

interface TeacherType {
  _id: { toString(): string };
  name: string;
  email: string;
  createdAt: string | number | Date;
  coursesCreated?: string[]; // Replace 'string' with a Course type if you have one
}

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  // Check if user is authenticated and is an admin
  if (!session?.user || session.user.role !== "admin") {
    redirect("/admin/signin");
  }

  await dbConnect();

  // Fetch users
  const students = await Student.find().sort({ createdAt: -1 }).limit(100);
  const teachers = await Teacher.find().sort({ createdAt: -1 }).limit(100);
  const admins = await Admin.find().sort({ createdAt: -1 }).limit(10);

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
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              <span>Email Student</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <UserCircle className="mr-2 h-4 w-4" />
                              <span>View Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              Suspend Account
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
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              <span>Email Teacher</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <UserCircle className="mr-2 h-4 w-4" />
                              <span>View Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <BookOpen className="mr-2 h-4 w-4" />
                              <span>View Courses</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              Suspend Account
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
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(admins as AdminType[]).map((admin: AdminType) => (
                    <TableRow key={admin._id.toString()}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                        {admin.name}
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
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
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              <span>Email Admin</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <UserCircle className="mr-2 h-4 w-4" />
                              <span>View Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              Revoke Access
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
    </div>
  );
}
