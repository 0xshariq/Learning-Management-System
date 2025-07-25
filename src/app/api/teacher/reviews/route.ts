import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import { Review } from '@/models/review'
import { Course } from '@/models/course'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }

    await dbConnect()

    // First, get all courses created by this teacher
    const teacherCourses = await Course.find({ 
      teacher: session.user.id 
    }).select('_id').lean()

    const courseIds = teacherCourses.map(course => course._id.toString())

    if (courseIds.length === 0) {
      return NextResponse.json({
        reviews: [],
        stats: {
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        }
      })
    }

    // Fetch all reviews for teacher's courses
    const reviewsRaw = await Review.find({
      course: { $in: courseIds }
    })
      .populate('student', 'name')
      .populate('course', 'name')
      .sort({ createdAt: -1 })
      .lean()

    // Serialize reviews
    const reviews = reviewsRaw.map((review: any) => ({
      _id: review._id.toString(),
      rating: review.rating,
      comment: review.comment || '',
      createdAt: review.createdAt,
      student: {
        _id: review.student._id.toString(),
        name: review.student.name
      },
      course: {
        _id: review.course._id.toString(),
        name: review.course.name
      }
    }))

    // Calculate statistics
    const totalReviews = reviews.length
    const averageRating = totalReviews > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
      : 0

    // Calculate rating distribution
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviews.forEach(review => {
      ratingDistribution[review.rating as keyof typeof ratingDistribution]++
    })

    const stats = {
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      ratingDistribution
    }

    return NextResponse.json({
      reviews,
      stats
    })

  } catch (error) {
    console.error('Error fetching teacher reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
