import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import {Student} from '@/models/student'
import {Teacher} from '@/models/teacher'
import {Admin} from '@/models/admin'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    let users = []

    switch (type) {
      case 'students':
        users = await Student.find({})
          .select('name email createdAt purchasedCourses isActive')
          .sort({ createdAt: -1 })
          .lean()
        break
      
      case 'teachers':
        users = await Teacher.find({})
          .select('name email createdAt coursesCreated isActive')
          .sort({ createdAt: -1 })
          .lean()
        break
      
      case 'admins':
        users = await Admin.find({})
          .select('name email createdAt isActive')
          .sort({ createdAt: -1 })
          .lean()
        break
      
      default:
        // Fetch all types
        const [students, teachers, admins] = await Promise.all([
          Student.find({})
            .select('name email createdAt purchasedCourses isActive')
            .sort({ createdAt: -1 })
            .lean(),
          Teacher.find({})
            .select('name email createdAt coursesCreated isActive')
            .sort({ createdAt: -1 })
            .lean(),
          Admin.find({})
            .select('name email createdAt isActive')
            .sort({ createdAt: -1 })
            .lean()
        ])

        return NextResponse.json({
          students: students || [],
          teachers: teachers || [],
          admins: admins || []
        })
    }

    return NextResponse.json({
      users: users || []
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
