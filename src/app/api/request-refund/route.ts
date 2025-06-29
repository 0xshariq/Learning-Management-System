import { NextRequest, NextResponse } from "next/server";
import { requestRefundSchema, RequestRefund } from "@/models/request-refund";
import { dbConnect } from "@/lib/dbConnect";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Course } from "@/models/course";
import { Student } from "@/models/student";

// POST - Create a new refund request
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    
    // Only students can request refunds
    if (!session || session.user.role !== "student") {
      return NextResponse.json({ 
        error: "Unauthorized. Only students can request refunds." 
      }, { status: 401 });
    }

    let data;
    try {
      data = await req.json();
    } catch {
      return NextResponse.json({ 
        error: "Invalid JSON format." 
      }, { status: 400 });
    }

    console.log("Received refund request data:", data);

    // Extract required fields
    const { courseId, studentId, amount, reason, notes, refundReasonCategory, attachments } = data;

    // Validate required fields manually first
    if (!courseId || !studentId || !amount || !reason) {
      return NextResponse.json({
        error: "Missing required fields: courseId, studentId, amount, and reason are required."
      }, { status: 400 });
    }

    // Verify the student making the request matches the session
    if (studentId !== session.user.id) {
      return NextResponse.json({ 
        error: "You can only request refunds for your own enrollments." 
      }, { status: 403 });
    }

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ 
        error: "Course not found." 
      }, { status: 404 });
    }

    console.log("Course found:", course.name);

    // Verify student exists and is enrolled in the course
    const student = await Student.findById(studentId);
    if (!student) {
      return NextResponse.json({ 
        error: "Student not found." 
      }, { status: 404 });
    }

    if (!student.purchasedCourses?.includes(courseId)) {
      return NextResponse.json({ 
        error: "You are not enrolled in this course." 
      }, { status: 403 });
    }

    console.log("Student verification passed");

    // Check if refund request already exists for this student and course
    const existingRequest = await RequestRefund.findOne({
      courseId,
      studentId,
      requestStatus: { $in: ["pending", "accepted"] }
    });

    if (existingRequest) {
      return NextResponse.json({ 
        error: "A refund request already exists for this course. You cannot submit multiple requests." 
      }, { status: 400 });
    }

    console.log("No existing request found, creating new one");

    // Prepare request data
    const requestData = {
      courseId,
      studentId,
      amount: parseFloat(amount),
      reason,
      notes: notes || "",
      refundReasonCategory: refundReasonCategory || "other",
      attachments: attachments || [],
      requestStatus: "pending",
      requestedAt: new Date()
    };

    console.log("Request data to be created:", requestData);

    // Validate with Zod schema
    const parseResult = requestRefundSchema.safeParse(requestData);
    if (!parseResult.success) {
      console.error("Validation failed:", parseResult.error);
      return NextResponse.json({
        error: "Validation failed",
        details: parseResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      }, { status: 400 });
    }

    // Create refund request
    const refundRequest = await RequestRefund.create(parseResult.data);
    console.log("Refund request created:", refundRequest._id);

    // Populate the created request with course and student details
    const populatedRequest = await RequestRefund.findById(refundRequest._id)
      .populate("courseId", "name price")
      .populate("studentId", "name email")
      .lean();

    console.log("Populated request:", populatedRequest);

    return NextResponse.json({
      message: "Refund request submitted successfully. It will be reviewed by the course instructor.",
      request: {
        _id: populatedRequest._id,
        courseId: populatedRequest.courseId,
        studentId: populatedRequest.studentId,
        amount: populatedRequest.amount,
        reason: populatedRequest.reason,
        refundReasonCategory: populatedRequest.refundReasonCategory,
        requestStatus: populatedRequest.requestStatus,
        requestedAt: populatedRequest.requestedAt,
        createdAt: populatedRequest.createdAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating refund request:", error);
    return NextResponse.json({
      error: "An unexpected error occurred while submitting your refund request. Please try again later.",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// GET - Fetch refund requests
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ 
        error: "Authentication required." 
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const status = searchParams.get("status");

    let query: any = {};

    if (session.user.role === "student") {
      // Students can only see their own refund requests
      query.studentId = session.user.id;
      
      if (courseId) {
        query.courseId = courseId;
      }
    } else if (session.user.role === "teacher") {
      // Teachers can see refund requests for their courses
      const teacherCourses = await Course.find({ teacher: session.user.id }).select("_id");
      const courseIds = teacherCourses.map(course => course._id);
      
      query.courseId = { $in: courseIds };
      
      if (courseId && courseIds.some(id => id.toString() === courseId)) {
        query.courseId = courseId;
      }
    } else {
      return NextResponse.json({ 
        error: "Unauthorized access." 
      }, { status: 403 });
    }

    // Filter by status if provided
    if (status && ["pending", "accepted", "rejected"].includes(status)) {
      query.requestStatus = status;
    }

    // Fetch refund requests
    const refundRequests = await RequestRefund.find(query)
      .populate("courseId", "name price")
      .populate("studentId", "name email")
      .populate("processedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Format the response
    const formattedRequests = refundRequests.map(request => ({
      _id: request._id,
      course: {
        _id: request.courseId._id,
        name: request.courseId.name,
        price: request.courseId.price
      },
      student: {
        _id: request.studentId._id,
        name: request.studentId.name,
        email: request.studentId.email
      },
      amount: request.amount,
      reason: request.reason,
      notes: request.notes,
      refundReasonCategory: request.refundReasonCategory,
      requestStatus: request.requestStatus,
      processedBy: request.processedBy ? {
        _id: request.processedBy._id,
        name: request.processedBy.name,
        email: request.processedBy.email
      } : null,
      attachments: request.attachments,
      requestedAt: request.requestedAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    }));

    return NextResponse.json({
      requests: formattedRequests,
      total: formattedRequests.length
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching refund requests:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "An unexpected error occurred while fetching refund requests."
    }, { status: 500 });
  }
}

// PUT - Update refund request status (for teachers)
export async function PUT(req: NextRequest) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    
    // Only teachers can update refund request status
    if (!session || session.user.role !== "teacher") {
      return NextResponse.json({ 
        error: "Unauthorized. Only teachers can update refund request status." 
      }, { status: 401 });
    }

    let data;
    try {
      data = await req.json();
    } catch {
      return NextResponse.json({ 
        error: "Invalid JSON format." 
      }, { status: 400 });
    }

    const { requestId, status, notes } = data;

    if (!requestId || !status) {
      return NextResponse.json({ 
        error: "Request ID and status are required." 
      }, { status: 400 });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return NextResponse.json({ 
        error: "Status must be either 'accepted' or 'rejected'." 
      }, { status: 400 });
    }

    // Find the refund request
    const refundRequest = await RequestRefund.findById(requestId).populate("courseId");
    if (!refundRequest) {
      return NextResponse.json({ 
        error: "Refund request not found." 
      }, { status: 404 });
    }

    // Verify the teacher owns the course
    if (refundRequest.courseId.teacher.toString() !== session.user.id) {
      return NextResponse.json({ 
        error: "You can only update refund requests for your own courses." 
      }, { status: 403 });
    }

    // Update the refund request
    const updatedRequest = await RequestRefund.findByIdAndUpdate(
      requestId,
      {
        requestStatus: status,
        processedBy: session.user.id,
        notes: notes || refundRequest.notes,
        processedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    ).populate("courseId", "name price")
     .populate("studentId", "name email")
     .populate("processedBy", "name email");

    return NextResponse.json({
      message: `Refund request ${status} successfully.`,
      request: updatedRequest
    }, { status: 200 });

  } catch (error) {
    console.error("Error updating refund request:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "An unexpected error occurred while updating the refund request."
    }, { status: 500 });
  }
}