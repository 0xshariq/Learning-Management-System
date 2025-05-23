"use client"

import type React from "react"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { StarIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface ReviewData {
  _id: string
  rating: number
  comment: string
  student: {
    _id: string
    name: string
  }
  course: string
  createdAt: Date | string
}

interface CourseReviewsProps {
  courseId: string
  initialReviews: ReviewData[]
  isEnrolled: boolean
}

export default function CourseReviews({ courseId, initialReviews, isEnrolled }: CourseReviewsProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [reviews, setReviews] = useState<ReviewData[]>(initialReviews)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!session?.user) {
      toast({
        title: "Authentication required",
        description: "You must be signed in to leave a review.",
        variant: "destructive",
      })
      return
    }

    if (!isEnrolled) {
      toast({
        title: "Enrollment required",
        description: "You must be enrolled in this course to leave a review.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          comment,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit review")
      }

      const newReview = await response.json()

      setReviews([newReview.review, ...reviews])
      setComment("")

      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      })
    } catch (error) {
      console.error("Error submitting review:", error)
      toast({
        title: "Error",
        description: "Failed to submit your review. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const StarRating = ({ value, onChange }: { value: number; onChange?: (rating: number) => void }) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange && onChange(star)}
            className={`${onChange ? "cursor-pointer" : "cursor-default"}`}
            tabIndex={onChange ? 0 : -1}
            aria-label={onChange ? `Set rating to ${star}` : `Rating: ${star}`}
          >
            <StarIcon className={`h-5 w-5 ${star <= value ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Student Reviews</h3>

      {isEnrolled && session?.user && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Your Rating</label>
                <StarRating value={rating} onChange={setRating} />
              </div>

              <div>
                <label htmlFor="comment" className="block text-sm font-medium mb-2">
                  Your Review
                </label>
                <Textarea
                  id="comment"
                  placeholder="Share your experience with this course..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                  rows={4}
                />
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review._id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{review.student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StarRating value={review.rating} />
                </div>
                <p className="text-sm">{review.comment}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border rounded-lg">
          <p className="text-muted-foreground">No reviews yet. Be the first to review this course!</p>
        </div>
      )}
    </div>
  )
}