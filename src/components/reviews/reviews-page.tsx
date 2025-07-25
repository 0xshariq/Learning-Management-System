"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Star, Search, MessageSquare, Users } from 'lucide-react'
import { format } from 'date-fns'

interface Review {
  _id: string
  rating: number
  comment: string
  createdAt: string
  student: {
    _id: string
    name: string
  }
  course: {
    _id: string
    name: string
  }
}

export default function ReviewsPageComponent() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [ratingFilter, setRatingFilter] = useState<string>('all')

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      const response = await fetch('/api/reviews')
      if (response.ok) {
        const data = await response.json()
        setReviews(data.reviews)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter reviews based on search term and rating
  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         review.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         review.course.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRating = ratingFilter === 'all' || review.rating.toString() === ratingFilter

    return matchesSearch && matchesRating
  })

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
        }`}
      />
    ))
  }

  // Calculate some stats
  const totalReviews = reviews.length
  const averageRating = totalReviews > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
    : 0
  const positiveReviews = reviews.filter(review => review.rating >= 4).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading reviews...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Student Reviews</h1>
        <p className="text-xl text-muted-foreground">
          See what our students say about their learning experience
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-12 w-12 text-blue-600 mx-auto mb-2" />
            <p className="text-3xl font-bold">{totalReviews}</p>
            <p className="text-sm text-muted-foreground">Total Reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Star className="h-12 w-12 text-yellow-600 mx-auto mb-2" />
            <p className="text-3xl font-bold">{averageRating.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">Average Rating</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <p className="text-3xl font-bold">{positiveReviews}</p>
            <p className="text-sm text-muted-foreground">Positive Reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>Reviews ({filteredReviews.length})</CardTitle>
          <CardDescription>
            Honest feedback from our learning community
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No reviews found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm || ratingFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No reviews available yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReviews.map((review) => (
                <Card key={review._id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col space-y-1">
                        <Badge variant="outline" className="w-fit">{review.course.name}</Badge>
                        <span className="text-sm font-medium">{review.student.name}</span>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <div className="flex">{renderStars(review.rating)}</div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(review.createdAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                    
                    {review.comment && (
                      <p className="text-gray-700 leading-relaxed text-sm">{review.comment}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
