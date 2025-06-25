import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import { Review } from "@/models/review";

export async function GET() {
  try {
    await dbConnect();

    // Use today's date as a seed to shuffle reviews in a deterministic way for the day
    const today = new Date();
    const seed =
      today.getFullYear() * 10000 +
      (today.getMonth() + 1) * 100 +
      today.getDate();

    // Add a random field based on the seed (pseudo-random for the day)
    const reviews = await Review.aggregate([
      { $match: { rating: { $gte: 4 } } },
      {
        $addFields: {
          randomSort: {
            $mod: [
              {
                $add: [
                  { $toLong: "$_id" },
                  seed,
                ],
              },
              1000000,
            ],
          },
        },
      },
      { $sort: { randomSort: 1 } },
      { $limit: 3 },
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
      { $unwind: "$student" },
      { $unwind: "$course" },
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
    ]);

    return NextResponse.json({ reviews }, { status: 200 });
  } catch (error) {
    console.error("Error fetching featured reviews:", error);
    return NextResponse.json({ message: "Failed to fetch reviews" }, { status: 500 });
  }
}