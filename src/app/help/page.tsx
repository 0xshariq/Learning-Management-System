import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, FileText, HelpCircle, MessageSquare, Video } from "lucide-react"

export const metadata: Metadata = {
  title: "Help Center | Learning Management System",
  description: "Get help and support for using our learning platform.",
}

export default function HelpCenterPage() {
  return (
    <div className="flex justify-center items-center min-h-screen py-12">
      <div className="container max-w-6xl px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Help Center</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Find answers to your questions and learn how to get the most out of our learning platform.
          </p>
        </div>

        <div className="mb-8 max-w-2xl mx-auto">
          <div className="relative">
            <Input type="search" placeholder="Search for help articles..." className="w-full pl-10 py-6 text-lg" />
            <HelpCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <Tabs defaultValue="students" className="mb-8">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
            <TabsTrigger value="students">For Students</TabsTrigger>
            <TabsTrigger value="teachers">For Teachers</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
          <TabsContent value="students" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <BookOpen className="h-5 w-5 mr-2 text-primary" />
                    Enrollment & Courses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        How to enroll in a course
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Accessing course materials
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Course completion certificates
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Tracking your progress
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        View all articles →
                      </Link>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <Video className="h-5 w-5 mr-2 text-primary" />
                    Video Lessons
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Video playback issues
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Enabling captions
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Downloading videos for offline viewing
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Video quality settings
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        View all articles →
                      </Link>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-primary" />
                    Quizzes & Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Taking quizzes
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Submitting assignments
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Viewing feedback and grades
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Assignment deadlines
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        View all articles →
                      </Link>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="teachers" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <BookOpen className="h-5 w-5 mr-2 text-primary" />
                    Course Creation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Creating your first course
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Course structure best practices
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Setting course pricing
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Publishing your course
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        View all articles →
                      </Link>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <Video className="h-5 w-5 mr-2 text-primary" />
                    Video Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Uploading videos
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Adding captions
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Video quality guidelines
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Organizing video content
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        View all articles →
                      </Link>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2 text-primary" />
                    Student Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Viewing student progress
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Grading assignments
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Communicating with students
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Managing course discussions
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        View all articles →
                      </Link>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="general" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <HelpCircle className="h-5 w-5 mr-2 text-primary" />
                    Account Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Creating an account
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Updating your profile
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Password reset
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Account security
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        View all articles →
                      </Link>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-primary" />
                    Billing & Payments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Payment methods
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Invoices and receipts
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Refund policy
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Subscription management
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        View all articles →
                      </Link>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2 text-primary" />
                    Technical Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Browser compatibility
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Mobile app troubleshooting
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Connection issues
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        System requirements
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        View all articles →
                      </Link>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="bg-muted rounded-lg p-8 text-center max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Can&apos;t find what you&apos;re looking for? Our support team is ready to assist you with any questions or issues.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link href="/contact">Contact Support</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/faq">View FAQs</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
