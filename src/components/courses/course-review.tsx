"use client"

import type React from "react"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { StarIcon, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "../ui/label"

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
  courseName: string
  initialReviews: ReviewData[]
  isEnrolled: boolean
}

export function CourseReviews({ courseId, initialReviews, isEnrolled }: CourseReviewsProps) {
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
        let errorData: { message?: string } = {}
        try {
          errorData = await response.json()
        } catch {
          // Ignore JSON parsing errors
        }
        throw new Error(errorData.message || "Failed to submit review")
      }

      const newReview = await response.json()
      setReviews([newReview.review, ...reviews])
      setComment("")
      setRating(5)

      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      })
    } catch (error) {
      console.error("Error submitting review:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit your review. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const StarRating = ({
    value,
    onChange,
    readonly = false,
  }: { value: number; onChange?: (rating: number) => void; readonly?: boolean }) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Button
            key={star}
            type="button"
            onClick={() => !readonly && onChange && onChange(star)}
            className={`${!readonly && onChange ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform p-1`}
            tabIndex={!readonly && onChange ? 0 : -1}
            aria-label={onChange ? `Set rating to ${star}` : `Rating: ${star}`}
            disabled={readonly}
          >
            <StarIcon className={`h-5 w-5 ${star <= value ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
          </Button>
        ))}
      </div>
    )
  }

  const averageRating =
    reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Student Reviews</h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(averageRating)} readonly />
            <span className="text-sm text-muted-foreground">
              {averageRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
            </span>
          </div>
        )}
      </div>

      {isEnrolled && session?.user && (
        <Card>
          <CardHeader>
            <CardTitle>Write a Review</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <Label className="block text-sm font-medium mb-2">Your Rating</Label>
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
            <Card key={review._id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={`/placeholder.svg?height=40&width=40&text=${review.student.name.charAt(0)}`} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{review.student.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <StarRating value={review.rating} readonly />
                    </div>
                    <p className="text-sm leading-relaxed">{review.comment}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <h4 className="text-lg font-medium mb-2">No reviews yet</h4>
            <p className="text-muted-foreground">Be the first to review this course!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
