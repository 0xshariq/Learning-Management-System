import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
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

    // Fetch courses created by the logged-in teacher
    const courses = await Course.find({ 
      teacher: session.user.id,
      isPublished: true 
    })
      .select('_id name description price')
      .sort({ createdAt: -1 })
      .lean()

    // Serialize the courses data
    const serializedCourses = courses.map(course => ({
      _id: course._id.toString(),
      name: course.name,
      description: course.description,
      price: course.price
    }))

    return NextResponse.json({
      courses: serializedCourses
    })

  } catch (error) {
    console.error('Error fetching teacher courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
