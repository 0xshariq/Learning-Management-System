"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StarIcon, User, BookOpen } from "lucide-react"

interface ReviewData {
  _id: string
  rating: number
  comment: string
  student: {
    _id: string
    name: string
  }
  course: {
    _id: string
    name: string
  }
  createdAt: string
}

export function FeaturedReviews() {
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch("/api/reviews/featured")
        if (response.ok) {
          const data = await response.json()
          setReviews(data.reviews)
        }
      } catch (error) {
        console.error("Error fetching featured reviews:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()

    // Refresh reviews every 30 seconds
    const interval = setInterval(fetchReviews, 30000)
    return () => clearInterval(interval)
  }, [])

  const StarRating = ({ value }: { value: number }) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`h-4 w-4 ${star <= value ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-3 bg-muted rounded w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No reviews available at the moment.</p>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {reviews.map((review) => (
        <Card key={review._id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={`/placeholder.svg?height=40&width=40&text=${review.student.name.charAt(0)}`} />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium text-sm">{review.student.name}</h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BookOpen className="h-3 w-3" />
                  <span>{review.course.name}</span>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <StarRating value={review.rating} />
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{review.comment}</p>

            <div className="mt-3 text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
