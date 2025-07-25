import { NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import { Review } from '@/models/review'

export async function GET() {
  try {
    await dbConnect()

    // Fetch all reviews with populated student and course data
    const reviewsRaw = await Review.find({})
      .populate('student', 'name')
      .populate('course', 'name')
      .sort({ createdAt: -1 })
      .limit(50) // Limit to latest 50 reviews
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

    return NextResponse.json({ reviews })

  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
