"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BookOpen,
  Users,
  DollarSign,
  Star,
  Plus,
  Eye,
  EyeOff,
  BarChart3,
} from "lucide-react";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";

interface TeacherProfileData {
  teacher: {
    _id: string;
    name: string;
    email: string;
    bio?: string;
    phone?: string;
    website?: string;
    profileImage?: string;
    createdAt: Date;
  };
  courses: Array<{
    _id: string;
    name: string;
    description: string;
    imageUrl?: string;
    price: number;
    isPublished: boolean;
    studentCount: number;
    createdAt: Date;
  }>;
  stats: {
    totalCourses: number;
    totalStudents: number;
    totalRevenue: number;
    averageRating: number;
    publishedCourses: number;
  };
  recentReviews: Array<{
    _id: string;
    rating: number;
    comment: string;
    student: {
      name: string;
    };
    course: {
      name: string;
    };
    createdAt: Date;
  }>;
}

interface TeacherProfileProps {
  data: TeacherProfileData;
}

export function TeacherProfile({ data }: TeacherProfileProps) {
  const { teacher, courses, stats, recentReviews } = data;

  const [userData, setUserData] = useState({
    _id: teacher._id,
    name: teacher.name,
    email: teacher.email,
    bio: teacher.bio || "",
    phone: teacher.phone || "",
    website: teacher.website || "",
    profileImage: teacher.profileImage || "",
  });

  interface UpdatedProfileData {
    name?: string;
    email?: string;
    bio?: string;
    phone?: string;
    website?: string;
    profileImage?: string;
  }

  const handleProfileUpdate = (updatedData: UpdatedProfileData) => {
    setUserData((prev) => ({
      ...prev,
      ...updatedData,
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6 text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage
                  src={
                    userData.profileImage ||
                    `/placeholder.svg?height=96&width=96&text=${userData.name.charAt(
                      0
                    )}`
                  }
                />
                <AvatarFallback className="text-2xl">
                  {userData.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold mb-2">{userData.name}</h2>
              <p className="text-muted-foreground mb-4">{userData.email}</p>
              <Badge variant="outline" className="mb-4">
                Teacher
              </Badge>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Joined:</span>
                  <span>
                    {new Date(teacher.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Courses:</span>
                  <span>{stats.totalCourses}</span>
                </div>
                <div className="flex justify-between">
                  <span>Students:</span>
                  <span>{stats.totalStudents}</span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Link href="/teacher/dashboard">
                  <Button variant="outline" className="w-full gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Go to Dashboard
                  </Button>
                </Link>
                <EditProfileModal
                  userData={userData}
                  onProfileUpdate={handleProfileUpdate}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Teacher Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your courses and track your teaching performance
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Courses
                    </p>
                    <p className="text-2xl font-bold">{stats.totalCourses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Students
                    </p>
                    <p className="text-2xl font-bold">{stats.totalStudents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Revenue
                    </p>
                    <p className="text-2xl font-bold">
                      ₹{stats.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <Star className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                    <p className="text-2xl font-bold">
                      {stats.averageRating.toFixed(1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="courses" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="courses">My Courses</TabsTrigger>
              <TabsTrigger value="reviews">Recent Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="courses" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">My Courses</h3>
                <Link href="/teacher/courses/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Course
                  </Button>
                </Link>
              </div>

              {courses.length > 0 ? (
                <div className="space-y-4">
                  {courses.map((course) => (
                    <Card
                      key={course._id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="relative w-24 h-16 flex-shrink-0">
                            <Image
                              src={
                                course.imageUrl ||
                                `/placeholder.svg?height=64&width=96&text=${
                                  encodeURIComponent(course.name) ||
                                  "/placeholder.svg"
                                }`
                              }
                              alt={course.name}
                              fill
                              className="object-cover rounded"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold">{course.name}</h4>
                              <div className="flex gap-2">
                                <Badge
                                  variant={
                                    course.isPublished ? "default" : "outline"
                                  }
                                >
                                  {course.isPublished ? (
                                    <>
                                      <Eye className="h-3 w-3 mr-1" />
                                      Published
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="h-3 w-3 mr-1" />
                                      Draft
                                    </>
                                  )}
                                </Badge>
                                <Badge variant="outline">₹{course.price}</Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {course.description}
                            </p>
                            <div className="flex justify-between items-center">
                              <div className="flex gap-4 text-sm text-muted-foreground">
                                <span>{course.studentCount} students</span>
                                <span>
                                  Created{" "}
                                  {new Date(
                                    course.createdAt
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              <Link href={`/teacher/courses/${course._id}`}>
                                <Button variant="outline" size="sm">
                                  Manage
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">
                      No courses created yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Start sharing your knowledge by creating your first course
                    </p>
                    <Link href="/teacher/courses/create">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Course
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="space-y-6">
              <h3 className="text-xl font-semibold">Recent Reviews</h3>

              {recentReviews.length > 0 ? (
                <div className="space-y-4">
                  {recentReviews.map((review) => (
                    <Card key={review._id}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">
                              {review.course.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              by {review.student.name}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= review.rating
                                      ? "text-yellow-400 fill-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">
                          {review.comment}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No reviews yet</h3>
                    <p className="text-muted-foreground">
                      Reviews from your students will appear here
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
