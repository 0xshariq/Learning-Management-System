import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { dbConnect } from "@/lib/dbConnect";
import { Course } from "@/models/course";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
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
interface Teacher {
  name: string;
}

interface PublishedCourse {
  _id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  teacher: Teacher;
  createdAt?: string | Date;
}

interface UnpublishedCourse {
  _id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  teacher: Teacher;
  createdAt?: string | Date;
}
export default async function AdminCoursesPage() {
  const session = await getServerSession(authOptions);

  // Check if user is authenticated and is an admin
  if (!session?.user || session.user.role !== "admin") {
    redirect("/admin/signin");
  }

  await dbConnect();

  // Fetch courses
  const publishedCourses = await Course.find({ isPublished: true })
    .populate("teacher", "name")
    .sort({ createdAt: -1 })
    .limit(100);

  const unpublishedCourses = await Course.find({ isPublished: false })
    .populate("teacher", "name")
    .sort({ createdAt: -1 })
    .limit(100);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Course Management</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="published" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="published" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Published ({publishedCourses.length})
          </TabsTrigger>
          <TabsTrigger value="unpublished" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Unpublished ({unpublishedCourses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="published">
          <Card>
            <CardHeader>
              <CardTitle>Published Courses</CardTitle>
              <CardDescription>
                Manage courses that are live on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishedCourses.map((course: PublishedCourse) => (
                  <Card key={course._id.toString()} className="overflow-hidden">
                    <div className="relative aspect-video">
                      <Image
                        src={
                          course.imageUrl ||
                          `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(
                            course.name
                          )}`
                        }
                        alt={course.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg line-clamp-1">
                          {course.name}
                        </h3>
                        <Badge variant="secondary">₹{course.price}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {course.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">
                          By {course.teacher.name}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/courses/${course._id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                <span>View Course</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit Course</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <XCircle className="mr-2 h-4 w-4" />
                              <span>Unpublish</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete Course</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unpublished">
          <Card>
            <CardHeader>
              <CardTitle>Unpublished Courses</CardTitle>
              <CardDescription>
                Review and approve courses before they go live
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course Name</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {unpublishedCourses.map((course: UnpublishedCourse) => (
                    <TableRow key={course._id.toString()}>
                      <TableCell className="font-medium">
                      {course.name}
                      </TableCell>
                      <TableCell>{course.teacher.name}</TableCell>
                      <TableCell>₹{course.price}</TableCell>
                      <TableCell>
                      {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : "N/A"}
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
                        <DropdownMenuItem asChild>
                          <Link href={`/courses/${course._id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          <span>Preview</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          <span>Approve & Publish</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Reject & Delete</span>
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
