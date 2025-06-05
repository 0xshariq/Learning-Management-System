import Link from "next/link"
import { BookOpen, Facebook, Instagram, Twitter } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-background border-t">
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <BookOpen className="h-6 w-6" />
              <span className="font-bold">EduLearn</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              A modern learning platform for students and teachers. Access high-quality courses anytime, anywhere.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </Link>
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-4">For Students</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/courses/all" className="text-muted-foreground hover:text-primary">
                  Browse Courses
                </Link>
              </li>
              <li>
                <Link href="/student/signin" className="text-muted-foreground hover:text-primary">
                  Student Login
                </Link>
              </li>
              <li>
                <Link href="/student/signup" className="text-muted-foreground hover:text-primary">
                  Student Registration
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-muted-foreground hover:text-primary">
                  My Learning
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-4">For Teachers</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/teacher/signin" className="text-muted-foreground hover:text-primary">
                  Teacher Login
                </Link>
              </li>
              <li>
                <Link href="/teacher/signup" className="text-muted-foreground hover:text-primary">
                  Become an Instructor
                </Link>
              </li>
              <li>
                <Link href="/teacher/dashboard" className="text-muted-foreground hover:text-primary">
                  Teacher Dashboard
                </Link>
              </li>
              <li>
                <Link href="/teacher/courses/create" className="text-muted-foreground hover:text-primary">
                  Create a Course
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/help" className="text-muted-foreground hover:text-primary">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-muted-foreground hover:text-primary">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-primary">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-primary">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-10 pt-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} EduLearn. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
