"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface EnrollButtonProps {
  courseId: string
}

export default function EnrollButton({ courseId }: EnrollButtonProps) {
  const [isEnrolling, setIsEnrolling] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleEnroll = async () => {
    setIsEnrolling(true)

    try {
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to enroll in course")
      }

      toast({
        title: "Enrollment Successful",
        description: "You have successfully enrolled in this course.",
      })

      // Refresh the page to update enrollment status
      router.refresh()
    } catch (error) {
      console.error("Error enrolling in course:", error)
      toast({
        title: "Enrollment Failed",
        description: error instanceof Error ? error.message : "Failed to enroll in course. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsEnrolling(false)
    }
  }

  return (
    <Button onClick={handleEnroll} disabled={isEnrolling} className="w-full">
      {isEnrolling ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enrolling...
        </>
      ) : (
        "Enroll Now - Free"
      )}
    </Button>
  )
}
