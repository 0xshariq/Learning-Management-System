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
  Calendar,
  Star,
  User,
  PlayCircle,
  BarChart3,
} from "lucide-react";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";

interface StudentProfileData {
  student: {
    _id: string;
    name: string;
    email: string;
    bio?: string;
    phone?: string;
    website?: string;
    profileImage?: string;
    createdAt: Date;
    purchasedCourses: string[];
  };
  enrolledCourses: Array<{
    _id: string;
    name: string;
    description: string;
    imageUrl?: string;
    price: number;
    teacher: {
      name: string;
    };
  }>;
  reviews: Array<{
    _id: string;
    rating: number;
    comment: string;
    course: {
      _id: string;
      name: string;
    };
    createdAt: Date;
  }>;
}

interface StudentProfileProps {
  data: StudentProfileData;
}
interface UpdatedProfileData {
  name?: string;
  email?: string;
  bio?: string;
  phone?: string;
  website?: string;
  profileImage?: string;
}
export function StudentProfile({ data }: StudentProfileProps) {
  const { student, enrolledCourses, reviews } = data;

  const [userData, setUserData] = useState({
    _id: student._id,
    name: student.name,
    email: student.email,
    bio: student.bio || "",
    phone: student.phone || "",
    website: student.website || "",
    profileImage: student.profileImage || "",
  });

  const handleProfileUpdate = (updatedData: UpdatedProfileData) => {
    setUserData((prev) => ({
      ...prev,
      ...updatedData,
    }));
  };

  const totalCoursesEnrolled = enrolledCourses.length;
  const totalReviews = reviews.length;
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

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
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold mb-2">{userData.name}</h2>
              <p className="text-muted-foreground mb-4">{userData.email}</p>
              <Badge variant="outline" className="mb-4">
                Student
              </Badge>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Joined:</span>
                  <span>
                    {new Date(student.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Courses:</span>
                  <span>{totalCoursesEnrolled}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reviews:</span>
                  <span>{totalReviews}</span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Link href="/student/dashboard">
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
            <h1 className="text-3xl font-bold mb-2">My Profile</h1>
            <p className="text-muted-foreground">
              Manage your learning journey and track your progress
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Enrolled Courses
                    </p>
                    <p className="text-2xl font-bold">{totalCoursesEnrolled}</p>
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
                    <p className="text-sm text-muted-foreground">
                      Average Rating
                    </p>
                    <p className="text-2xl font-bold">
                      {averageRating.toFixed(1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Reviews Written
                    </p>
                    <p className="text-2xl font-bold">{totalReviews}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="courses" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="courses">My Courses</TabsTrigger>
              <TabsTrigger value="reviews">My Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="courses" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Enrolled Courses</h3>
                <Link href="/courses/all">
                  <Button variant="outline">Browse More Courses</Button>
                </Link>
              </div>

              {enrolledCourses.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {enrolledCourses.map((course) => (
                    <Card
                      key={course._id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-video relative">
                        <Image
                          src={
                            course.imageUrl ||
                            `/placeholder.svg?height=200&width=400&text=${
                              encodeURIComponent(course.name) ||
                              "/placeholder.svg"
                            }`
                          }
                          alt={course.name}
                          fill
                          className="object-cover rounded-t-lg"
                        />
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2">{course.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {course.description}
                        </p>
                        <p className="text-sm mb-3">
                          <span className="font-medium">Instructor:</span>{" "}
                          {course.teacher.name}
                        </p>
                        <div className="flex justify-between items-center">
                          <Badge variant="outline">
                            {course.price === 0 ? "Free" : `₹${course.price}`}
                          </Badge>
                          <Link href={`/courses/${course._id}`}>
                            <Button size="sm">
                              <PlayCircle className="h-4 w-4 mr-1" />
                              Continue
                            </Button>
                          </Link>
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
                      No courses enrolled yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Start your learning journey by enrolling in a course
                    </p>
                    <Link href="/courses/all">
                      <Button>Browse Courses</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="space-y-6">
              <h3 className="text-xl font-semibold">My Reviews</h3>

              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review._id}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">
                              {review.course.name}
                            </h4>
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
                      Share your experience by reviewing courses you&apos;ve
                      taken
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
