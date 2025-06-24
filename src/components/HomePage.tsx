"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpen,
  Users,
  Award,
  Clock,
  Globe,
  CheckCircle,
  DollarSign,
  Timer,
} from "lucide-react";
import { useEffect, useState } from "react";
import { FadeIn } from "@/components/animations/fade-in";
import { SlideIn } from "@/components/animations/slide-in";
import { ScaleIn } from "@/components/animations/scale-in";
import { StaggerChildren } from "@/components/animations/stagger-children";
import { TextReveal } from "@/components/animations/text-reveal";
import { FeaturedReviews } from "@/components/featured-reviews";
import { SaleTimer, SalePriceBlock } from "@/components/courses/course-sales";

interface Teacher {
  name: string;
}

interface SaleData {
  _id: string;
  amount: number;
  saleTime: string;
  expiryTime?: string;
  notes?: string;
}

interface CourseType {
  _id: string;
  name: string;
  description: string;
  imageUrl?: string;
  price: number;
  teacher?: Teacher;
  sale?: SaleData | null;
}

export default function Home() {
  const [featuredCourses, setFeaturedCourses] = useState<CourseType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch("/api/courses?isPublished=true");
        const data = await response.json();
        const courses: CourseType[] = data.courses.slice(0, 3);

        // Fetch active sale for each course
        const coursesWithSales = await Promise.all(
          courses.map(async (course) => {
            try {
              const saleRes = await fetch(`/api/courses/${course._id}/sales`);
              if (!saleRes.ok) return { ...course, sale: null };
              const saleData: { sales?: SaleData[] } = await saleRes.json();
              const now = new Date();
              const activeSale =
                saleData.sales?.find(
                  (sale) =>
                    new Date(sale.saleTime) <= now &&
                    (!sale.expiryTime || new Date(sale.expiryTime) >= now)
                ) || null;
              return { ...course, sale: activeSale };
            } catch {
              return { ...course, sale: null };
            }
          })
        );
        setFeaturedCourses(coursesWithSales);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-background to-muted">
          <div className="container mx-auto px-4 flex flex-col items-center justify-center gap-8 min-h-[70vh]">
            <ScaleIn
              delay={0.2}
              className="flex-1 flex justify-center items-center"
            >
              <Image
                src="/edulearn-logo.png"
                alt="Students learning online"
                width={60}
                height={40}
                className="rounded-lg shadow-lg"
                priority
              />
            </ScaleIn>
            <div className="flex-1 space-y-6 text-center flex flex-col justify-center items-center">
              <TextReveal
                text="Learn Without Limits"
                element="h1"
                className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
              />
              <FadeIn delay={0.3}>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                  Start, switch, or advance your career with thousands of
                  courses from expert instructors. Learn at your own pace,
                  anytime, anywhere.
                </p>
              </FadeIn>
              <FadeIn delay={0.5}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/courses">
                    <Button size="lg" className="gap-2">
                      Browse Courses <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/role">
                    <Button size="lg" variant="outline">
                      Join for Free
                    </Button>
                  </Link>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>
        {/* Featured Categories */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <FadeIn>
              <h2 className="text-3xl font-bold text-center mb-12">
                Popular Categories
              </h2>
            </FadeIn>
            <StaggerChildren className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <BookOpen className="h-10 w-10 mb-4 text-primary" />
                <h3 className="font-medium">Web Development</h3>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <Users className="h-10 w-10 mb-4 text-primary" />
                <h3 className="font-medium">Business</h3>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <Award className="h-10 w-10 mb-4 text-primary" />
                <h3 className="font-medium">Design</h3>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <Globe className="h-10 w-10 mb-4 text-primary" />
                <h3 className="font-medium">Marketing</h3>
              </div>
            </StaggerChildren>
          </div>
        </section>
        {/* Why Choose Us */}
        <section className="py-16 bg-muted">
          <div className="container mx-auto px-4">
            <FadeIn>
              <h2 className="text-3xl font-bold text-center mb-12">
                Why Choose EduLearn
              </h2>
            </FadeIn>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <SlideIn direction="up" delay={0.1}>
                <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card">
                  <CheckCircle className="h-12 w-12 mb-4 text-primary" />
                  <h3 className="text-xl font-bold mb-2">Quality Content</h3>
                  <p className="text-muted-foreground">
                    Expertly crafted courses designed to help you master new
                    skills quickly and effectively.
                  </p>
                </div>
              </SlideIn>
              <SlideIn direction="up" delay={0.2}>
                <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card">
                  <Users className="h-12 w-12 mb-4 text-primary" />
                  <h3 className="text-xl font-bold mb-2">Expert Instructors</h3>
                  <p className="text-muted-foreground">
                    Learn from industry professionals with years of experience
                    in their respective fields.
                  </p>
                </div>
              </SlideIn>
              <SlideIn direction="up" delay={0.3}>
                <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card">
                  <Clock className="h-12 w-12 mb-4 text-primary" />
                  <h3 className="text-xl font-bold mb-2">Flexible Learning</h3>
                  <p className="text-muted-foreground">
                    Study at your own pace, on your own schedule, from anywhere
                    in the world.
                  </p>
                </div>
              </SlideIn>
            </div>
          </div>
        </section>
        {/* Featured Courses */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
              <FadeIn>
                <h2 className="text-3xl font-bold">Featured Courses</h2>
              </FadeIn>
              <FadeIn delay={0.2}>
                <Link href="/courses">
                  <Button variant="outline" className="gap-2 w-full md:w-auto">
                    View All <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </FadeIn>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="border rounded-lg overflow-hidden bg-card animate-pulse"
                  >
                    <div className="aspect-video bg-muted" />
                    <div className="p-4 space-y-3">
                      <div className="h-6 bg-muted rounded" />
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-5 bg-muted rounded w-1/4" />
                        <div className="h-8 bg-muted rounded w-1/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : featuredCourses.length > 0 ? (
              <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {featuredCourses.map((course: CourseType) => (
                  <div
                    key={course._id}
                    className="border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow flex flex-col"
                  >
                    <div className="aspect-video relative bg-muted">
                      <Image
                        src={
                          course.imageUrl ||
                          "/placeholder.svg?height=200&width=400&text=Course" ||
                          "/placeholder.svg"
                        }
                        alt={course.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        priority
                      />
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-bold text-lg mb-2">{course.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {course.description.length > 100
                          ? `${course.description.substring(0, 100)}...`
                          : course.description}
                      </p>
                      <p className="text-sm mb-2">
                        <span className="font-medium">Instructor:</span>{" "}
                        {course.teacher?.name || "Unknown"}
                      </p>
                      <div className="flex justify-between items-center mt-auto pt-4 gap-2 flex-wrap">
                        <span className="font-bold text-base">
                          {course.sale ? (
                            <>
                              <span className="line-through text-muted-foreground mr-2">
                                ₹{course.price}
                              </span>
                              <span>
                                <SalePriceBlock
                                  sale={course.sale}
                                  price={course.price}
                                />
                              </span>
                              <span>
                                <SaleTimer
                                  expiryTime={course.sale.expiryTime}
                                />
                              </span>
                            </>
                          ) : course.price === 0 ? (
                            "Free"
                          ) : (
                            `₹${course.price}`
                          )}
                        </span>
                        <Link href={`/courses/${course._id}`}>
                          <Button
                            size="sm"
                            className="w-full sm:w-auto mt-2 sm:mt-0"
                          >
                            View Course
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </StaggerChildren>
            ) : (
              <FadeIn className="text-center py-10 max-w-md mx-auto">
                <h3 className="text-lg font-medium mb-2">
                  No courses available yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Be the first to create a course or check back later
                </p>
                <Link href="/teacher/courses/create">
                  <Button>Create a Course</Button>
                </Link>
              </FadeIn>
            )}
          </div>
        </section>
        {/* Student Reviews */}
        <section className="py-16 bg-muted">
          <div className="container mx-auto px-4">
            <FadeIn>
              <h2 className="text-3xl font-bold text-center mb-12">
                What Our Students Say
              </h2>
            </FadeIn>
            <FeaturedReviews />
          </div>
        </section>
        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <FadeIn>
              <h2 className="text-3xl font-bold mb-4">
                Ready to Start Learning?
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of students who are already learning on our
                platform. Start your journey today!
              </p>
            </FadeIn>
            <ScaleIn delay={0.4}>
              <Link href="/role">
                <Button size="lg" variant="secondary" className="gap-2">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </ScaleIn>
          </div>
        </section>
      </main>
    </div>
  );
}
