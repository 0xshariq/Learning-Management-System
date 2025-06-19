"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, BookOpen, DollarSign, Star, TrendingUp, UserCheck, GraduationCap, BarChart3 } from "lucide-react"

interface AdminProfileData {
  stats: {
    totalStudents: number
    totalTeachers: number
    totalCourses: number
    publishedCourses: number
    totalReviews: number
    totalRevenue: number
    averageRating: number
  }
  recentActivity: {
    students: Array<{
      _id: string
      name: string
      email: string
      createdAt: Date
    }>
    teachers: Array<{
      _id: string
      name: string
      email: string
      createdAt: Date
    }>
    courses: Array<{
      _id: string
      name: string
      teacher: string
      isPublished: boolean
      createdAt: Date
    }>
  }
}

interface AdminProfileProps {
  data: AdminProfileData
}

export function AdminProfile({ data }: AdminProfileProps) {
  const { stats, recentActivity } = data

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Monitor platform performance and manage users</p>
      </div>

      <div className="mb-6">
        <Link href="/admin/dashboard">
          <Button variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Go to Dashboard
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <GraduationCap className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Teachers</p>
                <p className="text-2xl font-bold">{stats.totalTeachers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Courses</p>
                <p className="text-2xl font-bold">{stats.totalCourses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-cyan-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Published Courses</p>
                <p className="text-2xl font-bold">{stats.publishedCourses}</p>
                <p className="text-xs text-muted-foreground">
                  {((stats.publishedCourses / stats.totalCourses) * 100).toFixed(1)}% of total
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
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">From {stats.totalReviews} reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <UserCheck className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">{stats.totalReviews}</p>
                <p className="text-xs text-muted-foreground">User feedback</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="students">Recent Students</TabsTrigger>
          <TabsTrigger value="teachers">Recent Teachers</TabsTrigger>
          <TabsTrigger value="courses">Recent Courses</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recently Joined Students</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.students.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.students.map((student) => (
                    <div key={student._id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Avatar>
                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium">{student.name}</h4>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">Student</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(student.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No recent students</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recently Joined Teachers</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.teachers.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.teachers.map((teacher) => (
                    <div key={teacher._id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Avatar>
                        <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium">{teacher.name}</h4>
                        <p className="text-sm text-muted-foreground">{teacher.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">Teacher</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(teacher.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No recent teachers</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recently Created Courses</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.courses.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.courses.map((course) => (
                    <div key={course._id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{course.name}</h4>
                        <p className="text-sm text-muted-foreground">by {course.teacher}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={course.isPublished ? "default" : "outline"}>
                          {course.isPublished ? "Published" : "Draft"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(course.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No recent courses</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
