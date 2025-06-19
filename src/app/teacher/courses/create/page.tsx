"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Upload } from "lucide-react"
import * as z from "zod"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

// Define the form schema
const formSchema = z.object({
  name: z.string().min(5, {
    message: "Course name must be at least 5 characters.",
  }),
  description: z.string().min(100, {
    message: "Description must be at least 100 characters.",
  }),
  syllabus: z.string().min(50, {
    message: "Syllabus must be at least 50 characters.",
  }),
  priceType: z.enum(["free", "paid"]),
  price: z.coerce.number().min(0).optional(),
  duration: z.string().min(2, {
    message: "Duration must be specified (e.g., &apos;4 weeks&apos;, &apos;10 hours&apos;).",
  }),
  category: z.string().min(1, {
    message: "Please select a category.",
  }),
  level: z.string().min(1, {
    message: "Please select a difficulty level.",
  }),
  imageUrl: z
    .string()
    .url({
      message: "Please enter a valid URL for the thumbnail.",
    })
    .optional()
    .or(z.literal("")),
  isPublished: z.boolean().default(false),
})

type FormValues = z.infer<typeof formSchema>

export default function CreateCoursePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      syllabus: "",
      priceType: "free",
      price: 0,
      duration: "",
      category: "",
      level: "",
      imageUrl: "",
      isPublished: false,
    },
  })

  const priceType = form.watch("priceType")

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", "course_thumbnails")

      const response = await fetch("/api/cloudinary/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload image")
      }

      const data = await response.json()
      form.setValue("imageUrl", data.url)

      toast({
        title: "Image uploaded",
        description: "Your course thumbnail has been uploaded successfully.",
      })
    } catch (error) {
      console.error("Error uploading image:", error)
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Redirect if not authenticated or not a teacher
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (status === "unauthenticated" || !session) {
    router.push("/teacher/signin")
    return null
  }

  if (session.user.role !== "teacher") {
    router.push("/")
    return null
  }

  // Format syllabus into weeks with bullet points
  const formatSyllabus = (syllabus: string) => {
    // Split by lines or paragraphs
    const lines = syllabus.split(/\n+/)
    const weeks: { title: string; items: string[] }[] = []

    let currentWeek: { title: string; items: string[] } | null = null

    lines.forEach((line) => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return

      // Check if line starts with "Week" or "Module"
      if (/^(Week|Module)\s+\d+/i.test(trimmedLine)) {
        if (currentWeek) {
          weeks.push(currentWeek)
        }
        currentWeek = { title: trimmedLine, items: [] }
      } else if (currentWeek) {
        currentWeek.items.push(trimmedLine)
      } else {
        // If no week has been defined yet, create a default one
        if (weeks.length === 0) {
          currentWeek = { title: "Week 1", items: [trimmedLine] }
          weeks.push(currentWeek)
        } else {
          weeks[weeks.length - 1].items.push(trimmedLine)
        }
      }
    })

    // Add the last week if it exists
    if (currentWeek && !weeks.includes(currentWeek)) {
      weeks.push(currentWeek)
    }

    return weeks
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)

    try {
      console.log("Submitting form with values:", values)

      // Format the syllabus into structured weeks
      const formattedSyllabus = formatSyllabus(values.syllabus)

      // Prepare the final price based on priceType
      const finalPrice = values.priceType === "free" ? 0 : values.price || 0

      const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          price: finalPrice,
          formattedSyllabus: JSON.stringify(formattedSyllabus),
          teacher: session.user.id,
        }),
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Error response:", errorData)
        throw new Error(errorData.message || "Failed to create course")
      }

      const data = await response.json()
      console.log("Success response:", data)

      toast({
        title: "Course Created",
        description: "Your course has been created successfully.",
      })

      // Redirect to the course page
      router.push(`/courses/${data.course._id}`)
    } catch (error) {
      console.error("Error creating course:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create course. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container py-10">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Create a New Course</CardTitle>
          <CardDescription>Fill in the details to create your course</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter course name" {...field} />
                    </FormControl>
                    <FormDescription>Choose a clear and descriptive name for your course.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description*</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your course content and what students will learn"
                        className="min-h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Minimum 100 characters. Explain what students will learn.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="syllabus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Syllabus*</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Outline the topics and modules covered in your course. Start each week with &apos;Week 1:&apos;, &apos;Week 2:&apos;, etc."
                        className="min-h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Format your syllabus by weeks (e.g., &quot;Week 1: Introduction to the course&quot; followed by bullet
                      points).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priceType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Course Pricing*</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="free" />
                          </FormControl>
                          <FormLabel className="font-normal">Free Course</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="paid" />
                          </FormControl>
                          <FormLabel className="font-normal">Paid Course</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {priceType === "paid" && (
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (₹)*</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          placeholder="Enter price"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Set the price for your course in Indian Rupees.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration*</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 4 weeks, 10 hours" {...field} />
                      </FormControl>
                      <FormDescription>Specify the total duration of your course.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category*</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="programming">Programming</SelectItem>
                          <SelectItem value="design">Design</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="photography">Photography</SelectItem>
                          <SelectItem value="music">Music</SelectItem>
                          <SelectItem value="health">Health & Fitness</SelectItem>
                          <SelectItem value="language">Language</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty Level*</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select difficulty level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="all-levels">All Levels</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Image</FormLabel>
                      <div className="flex items-center gap-3">
                        <FormControl>
                          <Input placeholder="Image URL" {...field} value={field.value || ""} className="flex-1" />
                        </FormControl>
                        <div className="relative">
                          <Input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleImageUpload}
                            disabled={isUploading}
                          />
                          <Button type="button" variant="outline" disabled={isUploading}>
                            {isUploading ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Upload className="h-4 w-4 mr-2" />
                            )}
                            Upload
                          </Button>
                        </div>
                      </div>
                      <FormDescription>Provide a URL or upload an image for your course thumbnail.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Publish immediately</FormLabel>
                      <FormDescription>If unchecked, your course will be saved as a draft.</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Course...
                  </>
                ) : (
                  "Create Course"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
