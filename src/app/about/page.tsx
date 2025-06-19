import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  Users,
  Video,
  Target,
  Heart,
  Lightbulb,
  Globe,
  ArrowRight,
  Upload,
  Shield,
  BarChart3,
  MessageSquare,
  Smartphone,
  Zap,
  AlertTriangle,
  Rocket,
} from "lucide-react"

export default function AboutPage() {
  const stats = [
    { label: "User Roles", value: "3", icon: Users, description: "Student, Teacher, Admin" },
    { label: "Course Management", value: "Full", icon: BookOpen, description: "Complete CRUD operations" },
    { label: "Video Upload", value: "Cloudinary", icon: Video, description: "Secure cloud storage" },
    { label: "Authentication", value: "NextAuth", icon: Shield, description: "Secure role-based access" },
  ]

  const features = [
    {
      icon: Users,
      title: "Multi-Role System",
      description:
        "Separate dashboards and functionalities for Students, Teachers, and Admins with role-based access control.",
      status: "✅ Complete",
    },
    {
      icon: BookOpen,
      title: "Course Management",
      description:
        "Teachers can create, edit, publish courses with detailed descriptions, pricing, and syllabus management.",
      status: "✅ Complete",
    },
    {
      icon: Video,
      title: "Video Upload & Management",
      description:
        "Cloudinary integration for secure video uploads with progress tracking and organized course content.",
      status: "✅ Complete",
    },
    {
      icon: Shield,
      title: "Secure Authentication",
      description: "NextAuth.js implementation with role-specific sign-in/sign-up flows and protected routes.",
      status: "✅ Complete",
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Comprehensive dashboards showing course stats, enrollment data, and user analytics for each role.",
      status: "✅ Complete",
    },
    {
      icon: MessageSquare,
      title: "Review System",
      description: "Students can rate and review courses with validation and enrollment verification.",
      status: "✅ Complete",
    },
    {
      icon: Upload,
      title: "Profile Management",
      description: "Complete profile editing with image uploads, bio updates, and role-specific information.",
      status: "✅ Complete",
    },
    {
      icon: Globe,
      title: "Responsive Design",
      description: "Mobile-first design with Tailwind CSS and shadcn/ui components for consistent user experience.",
      status: "✅ Complete",
    },
  ]

  const limitations = [
    {
      icon: AlertTriangle,
      title: "Payment Integration",
      description: "Currently no payment gateway integration for course purchases - enrollment is free for now.",
      impact: "Medium",
    },
    {
      icon: Video,
      title: "Video Player",
      description:
        "Basic video display without advanced player features like speed control, subtitles, or progress tracking.",
      impact: "Medium",
    },
    {
      icon: MessageSquare,
      title: "Real-time Communication",
      description: "No live chat, messaging system, or real-time notifications between users.",
      impact: "Low",
    },
    {
      icon: Smartphone,
      title: "Mobile App",
      description: "Web-only platform - no dedicated mobile applications for iOS/Android.",
      impact: "Low",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Basic analytics only - no detailed learning progress tracking or completion certificates.",
      impact: "Medium",
    },
  ]

  const futureImprovements = [
    {
      icon: Zap,
      title: "Payment Integration",
      description: "Stripe/Razorpay integration for course purchases with subscription models and discount codes.",
      priority: "High",
      timeline: "Q1 2024",
    },
    {
      icon: Video,
      title: "Advanced Video Player",
      description: "Custom video player with playback speed, subtitles, bookmarks, and watch progress tracking.",
      priority: "High",
      timeline: "Q1 2024",
    },
    {
      icon: MessageSquare,
      title: "Discussion Forums",
      description: "Course-specific discussion boards and Q&A sections for student-teacher interaction.",
      priority: "Medium",
      timeline: "Q2 2024",
    },
    {
      icon: BarChart3,
      title: "Learning Analytics",
      description: "Detailed progress tracking, completion certificates, and personalized learning recommendations.",
      priority: "Medium",
      timeline: "Q2 2024",
    },
    {
      icon: Smartphone,
      title: "Mobile Applications",
      description: "Native iOS and Android apps with offline video downloads and push notifications.",
      priority: "Low",
      timeline: "Q3 2024",
    },
    {
      icon: Lightbulb,
      title: "AI-Powered Features",
      description: "AI course recommendations, automated content generation, and intelligent search functionality.",
      priority: "Low",
      timeline: "Q4 2024",
    },
  ]

  const techStack = [
    { name: "Next.js 15", category: "Framework", description: "React framework with App Router" },
    { name: "TypeScript", category: "Language", description: "Type-safe development" },
    { name: "NextAuth.js", category: "Authentication", description: "Secure authentication system" },
    { name: "MongoDB", category: "Database", description: "NoSQL database with Mongoose" },
    { name: "Tailwind CSS", category: "Styling", description: "Utility-first CSS framework" },
    { name: "shadcn/ui", category: "Components", description: "Modern UI component library" },
    { name: "Cloudinary", category: "Media", description: "Cloud-based media management" },
    { name: "Vercel", category: "Deployment", description: "Serverless deployment platform" },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4" variant="outline">
                EduLearn Platform
              </Badge>
              <h1 className="text-4xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Modern Learning Management System
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                A comprehensive educational platform built with Next.js 15, featuring role-based access control, video
                course management, and secure authentication. Designed for scalable online learning experiences.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <Link href="/courses">
                    Explore Courses
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/role">Get Started</Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 p-8">
                <div className="grid grid-cols-2 gap-4 h-full">
                  <Card className="flex items-center justify-center">
                    <Users className="h-12 w-12 text-blue-600" />
                  </Card>
                  <Card className="flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-purple-600" />
                  </Card>
                  <Card className="flex items-center justify-center">
                    <Video className="h-12 w-12 text-green-600" />
                  </Card>
                  <Card className="flex items-center justify-center">
                    <BarChart3 className="h-12 w-12 text-orange-600" />
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Stats */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Platform Overview</h2>
            <p className="text-muted-foreground">Key features and capabilities of the EduLearn platform</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <stat.icon className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                  <div className="text-2xl font-bold mb-2">{stat.value}</div>
                  <div className="font-medium mb-1">{stat.label}</div>
                  <div className="text-sm text-muted-foreground">{stat.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Current Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive functionality for modern online learning management
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <feature.icon className="h-8 w-8 text-blue-600" />
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      {feature.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Technology Stack</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built with modern, scalable technologies for optimal performance
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {techStack.map((tech, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Badge className="mb-3" variant="secondary">
                      {tech.category}
                    </Badge>
                    <h3 className="font-semibold mb-2">{tech.name}</h3>
                    <p className="text-sm text-muted-foreground">{tech.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Limitations */}
      <section className="py-20 bg-red-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-red-800">Current Limitations</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Areas where the platform has room for improvement
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {limitations.map((limitation, index) => (
              <Card key={index} className="border-red-200">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <limitation.icon className="h-8 w-8 text-red-600" />
                    <Badge
                      variant="outline"
                      className={`${
                        limitation.impact === "High"
                          ? "text-red-600 border-red-600"
                          : limitation.impact === "Medium"
                            ? "text-orange-600 border-orange-600"
                            : "text-yellow-600 border-yellow-600"
                      }`}
                    >
                      {limitation.impact} Impact
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{limitation.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{limitation.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Future Improvements */}
      <section className="py-20 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-green-800">Future Roadmap</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Planned enhancements and new features for upcoming releases
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {futureImprovements.map((improvement, index) => (
              <Card key={index} className="border-green-200">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <improvement.icon className="h-8 w-8 text-green-600" />
                    <div className="flex gap-2">
                      <Badge
                        variant="outline"
                        className={`${
                          improvement.priority === "High"
                            ? "text-red-600 border-red-600"
                            : improvement.priority === "Medium"
                              ? "text-orange-600 border-orange-600"
                              : "text-blue-600 border-blue-600"
                        }`}
                      >
                        {improvement.priority}
                      </Badge>
                      <Badge variant="secondary">{improvement.timeline}</Badge>
                    </div>
                  </div>
                  <CardTitle className="text-xl">{improvement.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{improvement.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Mission */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Rocket className="h-16 w-16 mx-auto mb-8 opacity-90" />
            <h2 className="text-3xl lg:text-5xl font-bold mb-8">Platform Vision</h2>
            <p className="text-xl lg:text-2xl leading-relaxed opacity-90 mb-8">
              To create a comprehensive, scalable learning management system that empowers educators to deliver
              high-quality online courses while providing students with an engaging and intuitive learning experience.
            </p>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <Target className="h-12 w-12 mx-auto mb-4 opacity-80" />
                <h3 className="text-xl font-semibold mb-2">Scalable</h3>
                <p className="opacity-80">Built to handle growth from small courses to large institutions</p>
              </div>
              <div>
                <Heart className="h-12 w-12 mx-auto mb-4 opacity-80" />
                <h3 className="text-xl font-semibold mb-2">User-Centric</h3>
                <p className="opacity-80">Designed with educators and learners at the center</p>
              </div>
              <div>
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-80" />
                <h3 className="text-xl font-semibold mb-2">Innovative</h3>
                <p className="opacity-80">Leveraging modern technology for better learning outcomes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">Ready to Experience EduLearn?</h2>
          <p className="text-xl mb-8 text-muted-foreground max-w-2xl mx-auto">
            Explore our platform as a student, teacher, or admin to see all the features in action.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/courses">Browse Courses</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/role">Choose Your Role</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
