import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";
import { Sale, salesSchema } from "@/models/sales";
import mongoose from "mongoose";

// Create a new sale for a course
export async function POST(
  req: NextRequest,
  context: { params: { courseId?: string } }
) {
  await dbConnect();
  const { courseId } = await context.params;

  if (!courseId) {
    return NextResponse.json(
      { success: false, error: "Missing courseId in params" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const payload = { ...body, course: courseId };

    const parsed = salesSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    const sale = await Sale.create(parsed.data);
    // Populate course and teacher for the response
    const populatedSale = await Sale.findById(sale._id)
      .populate("course")
      .populate("teacher")
      .lean();

    return NextResponse.json({ success: true, sale: populatedSale }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Get all sales for a course
export async function GET(
  req: NextRequest,
  context: { params: { courseId?: string } }
) {
  await dbConnect();
  const { courseId } = await context.params;

  if (!courseId) {
    return NextResponse.json(
      { success: false, error: "Missing courseId in params" },
      { status: 400 }
    );
  }

  try {
    const sales = await Sale.find({ course: courseId })
      .populate("course")
      .populate("teacher")
      .lean();
    return NextResponse.json({ success: true, sales }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Update a sale by ID
export async function PATCH(
  req: NextRequest,
  context: { params: { courseId?: string } }
) {
  await dbConnect();
  const { courseId } = await context.params;

  if (!courseId) {
    return NextResponse.json(
      { success: false, error: "Missing courseId in params" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing sale ID" },
        { status: 400 }
      );
    }

    const parsed = salesSchema.partial().safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid update data" },
        { status: 400 }
      );
    }

    const sale = await Sale.findOneAndUpdate(
      { _id: id, course: courseId },
      parsed.data,
      { new: true }
    )
      .populate("course")
      .populate("teacher")
      .lean();

    if (!sale) {
      return NextResponse.json(
        { success: false, error: "Sale not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, sale }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete a sale by ID
export async function DELETE(
  req: NextRequest,
  context: { params: { courseId?: string } }
) {
  await dbConnect();
  const { courseId } = await context.params;

  if (!courseId) {
    return NextResponse.json(
      { success: false, error: "Missing courseId in params" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { id } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing sale ID" },
        { status: 400 }
      );
    }

    const sale = await Sale.findOneAndDelete({ _id: id, course: courseId })
      .populate("course")
      .populate("teacher")
      .lean();

    if (!sale) {
      return NextResponse.json(
        { success: false, error: "Sale not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Sale deleted", sale }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}