"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Eye, EyeOff, Trash2, Video } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TeacherCourse {
  _id: string;
  name: string;
  description: string;
  syllabus?: string;
  price: number;
  duration: string;
  imageUrl?: string;
  isPublished: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  videoCount: number;
  teacher: string;
  studentsPurchased?: string[];
}

interface ApiResponse<T> {
  courses?: T[];
  message?: string;
}

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Fetch courses for the logged-in teacher
  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/courses");
        if (!res.ok) throw new Error("Failed to fetch courses");
        const data: ApiResponse<TeacherCourse> = await res.json();
        setCourses(data.courses || []);
      } catch (err) {
        const error = err as Error;
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // Publish/Unpublish handler
  const handleTogglePublish = async (
    courseId: string,
    isPublished: boolean
  ) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublished: !isPublished }),
        });
        const data: { message?: string } = await res.json();
        if (!res.ok)
          throw new Error(data.message || "Failed to update publish status");
        toast({ title: data.message || "Course status updated" });
        setCourses((prev) =>
          prev.map((c) =>
            c._id === courseId ? { ...c, isPublished: !isPublished } : c
          )
        );
      } catch (err) {
        const error = err as Error;
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleDelete = async (courseId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this course? This action cannot be undone."
      )
    )
      return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}`, {
          method: "DELETE",
        });
        const data: { message?: string } = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to delete course");
        toast({ title: data.message || "Course deleted" });
        setCourses((prev) => prev.filter((c) => c._id !== courseId));
      } catch (err) {
        const error = err as Error;
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="text-lg">Loading your courses...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Courses</h1>
          <p className="text-muted-foreground mt-2">
            Manage your courses and content
          </p>
        </div>
        <Link href="/teacher/courses/create">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Course
          </Button>
        </Link>
      </div>

      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card
              key={course._id}
              className="flex flex-col h-full overflow-hidden"
            >
              <div className="aspect-video relative bg-muted">
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
                <div className="absolute top-2 right-2">
                  <Badge variant={course.isPublished ? "default" : "outline"}>
                    {course.isPublished ? "Published" : "Draft"}
                  </Badge>
                </div>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-xl line-clamp-2">
                  {course.name}
                </CardTitle>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    <Video className="mr-1 h-3 w-3" /> {course.videoCount}{" "}
                    videos
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-grow">
                <p className="text-muted-foreground line-clamp-3">
                  {course.description}
                </p>
                <div className="mt-4">
                  <p className="font-medium">Price: ₹{course.price}</p>
                  <p className="text-sm text-muted-foreground">
                    Duration: {course.duration}
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
                {/* Edit */}
                <Link href={`/teacher/courses/${course._id}`}>
                  <Button variant="outline" size="sm">
                    <Edit className="mr-1 h-4 w-4" /> Edit
                  </Button>
                </Link>
                {/* Preview */}
                <Link href={`/courses/${course._id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="mr-1 h-4 w-4" /> Preview
                  </Button>
                </Link>
                {/* Publish/Unpublish */}
                <Button
                  variant="outline"
                  size="sm"
                  className={
                    course.isPublished ? "text-amber-500" : "text-green-500"
                  }
                  disabled={isPending}
                  onClick={() =>
                    handleTogglePublish(course._id, course.isPublished)
                  }
                >
                  {course.isPublished ? (
                    <>
                      <EyeOff className="mr-1 h-4 w-4" /> Unpublish
                    </>
                  ) : (
                    <>
                      <Eye className="mr-1 h-4 w-4" /> Publish
                    </>
                  )}
                </Button>
                {/* Delete */}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  disabled={isPending}
                  onClick={() => handleDelete(course._id)}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg">
          <h2 className="text-xl font-medium mb-2">
            You haven&apos;t created any courses yet
          </h2>
          <p className="text-muted-foreground mb-6">
            Start creating your first course and share your knowledge with
            students.
          </p>
          <Link href="/teacher/courses/create">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Course
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
