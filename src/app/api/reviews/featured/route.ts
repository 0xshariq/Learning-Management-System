import { NextResponse } from "next/server"
import { dbConnect } from "@/lib/dbConnect"
import { Review } from "@/models/review"

export async function GET() {
  try {
    await dbConnect()

    // Get 3 random reviews from the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const reviews = await Review.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          rating: { $gte: 4 }, // Only show good reviews (4+ stars)
        },
      },
      { $sample: { size: 3 } }, // Get 3 random reviews
      {
        $lookup: {
          from: "students",
          localField: "student",
          foreignField: "_id",
          as: "student",
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "course",
        },
      },
      {
        $unwind: "$student",
      },
      {
        $unwind: "$course",
      },
      {
        $project: {
          _id: 1,
          rating: 1,
          comment: 1,
          createdAt: 1,
          "student._id": 1,
          "student.name": 1,
          "course._id": 1,
          "course.name": 1,
        },
      },
    ])

    return NextResponse.json({ reviews }, { status: 200 })
  } catch (error) {
    console.error("Error fetching featured reviews:", error)
    return NextResponse.json({ message: "Failed to fetch reviews" }, { status: 500 })
  }
}
