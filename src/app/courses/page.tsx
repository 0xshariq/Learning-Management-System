import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Users,
  Calendar,
  SortAsc,
  SortDesc,
} from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import { Course } from "@/models/course";
import { Sale } from "@/models/sales";
import { Suspense } from "react";
import { DebouncedSearchInput } from "@/components/courses/debounced-search-input";
import { SaleTimer, SalePriceBlock } from "@/components/courses/course-sales";

interface Teacher {
  _id: string;
  name: string;
  email: string;
}

interface SaleData {
  _id: string;
  amount: number;
  saleTime: string;
  expiryTime?: string;
  notes?: string;
}

interface CourseType {
  _id: string;
  teacher: Teacher;
  name: string;
  description: string;
  imageUrl?: string;
  duration: string;
  createdAt: string;
  price: number;
  studentsPurchased?: string[];
}

interface CourseWithEnrollment extends CourseType {
  enrollmentCount: number;
  sale?: SaleData | null;
}

interface CourseTeacher {
  _id: string;
  name: string;
  email: string;
}

interface CourseMapped {
  _id: string;
  teacher: CourseTeacher;
  name: string;
  description: string;
  imageUrl: string;
  duration: string;
  createdAt: string;
  price: number;
  studentsPurchased: string[];
}

interface ISale {
  _id: string;
  course: string;
  amount: number;
  saleTime: string;
  expiryTime?: string;
  notes?: string;
}

// Helper to get active sale for a course
function getSaleForCourse(sales: ISale[], courseId: string): SaleData | null {
  const now = new Date();
  const found = sales.find(
    (sale) =>
      sale.course === courseId &&
      new Date(sale.saleTime) <= now &&
      (!sale.expiryTime || new Date(sale.expiryTime) >= now)
  );
  return found
    ? {
        _id: found._id,
        amount: found.amount,
        saleTime: found.saleTime,
        expiryTime: found.expiryTime,
        notes: found.notes,
      }
    : null;
}

// Fetch all courses with sorting and filtering
async function getAllCourses(
  searchQuery?: string | null,
  sortBy = "createdAt",
  sortOrder = "desc"
) {
  await dbConnect();

  try {
    const query: {
      isPublished: boolean;
      $or?: {
        name?: { $regex: string; $options: string };
        description?: { $regex: string; $options: string };
      }[];
    } = { isPublished: true };

    if (searchQuery) {
      query.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
      ];
    }

    // Only allow sorting by whitelisted fields
    const allowedSorts = ["createdAt", "price", "name"];
    const sortField = allowedSorts.includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sortField] = sortDirection;

    const courses = await Course.find(query)
      .populate("teacher", "name email")
      .sort(sortOptions)
      .lean();

    return courses.map(
      (course: CourseType): CourseMapped => ({
        _id: course._id.toString(),
        teacher: {
          _id: course.teacher._id.toString(),
          name: course.teacher.name,
          email: course.teacher.email,
        },
        name: course.name,
        description: course.description,
        imageUrl: course.imageUrl || "",
        duration: course.duration,
        createdAt: course.createdAt.toString(),
        price: course.price,
        studentsPurchased:
          course.studentsPurchased?.map((id: string) => id.toString()) || [],
      })
    );
  } catch (error) {
    console.error("Error fetching courses:", error);
    return [];
  }
}

// Fetch enrollment count for a course
async function getEnrollmentCount(courseId: string) {
  await dbConnect();
  try {
    const course = (await Course.findById(
      courseId
    ).lean()) as CourseType | null;
    return course ? course.studentsPurchased?.length || 0 : 0;
  } catch (error) {
    console.error(
      `Error getting enrollment count for course ${courseId}:`,
      error
    );
    return 0;
  }
}

// Fetch all active sales for a set of course IDs
async function getActiveSales(courseIds: string[]) {
  await dbConnect();
  try {
    const now = new Date();
    const sales: ISale[] = await Sale.find({
      course: { $in: courseIds },
      saleTime: { $lte: now },
      $or: [{ expiryTime: { $gte: now } }, { expiryTime: null }],
    }).lean();
    return sales.map((sale) => ({
      ...sale,
      course: sale.course.toString(),
      _id: sale._id.toString(),
      saleTime: sale.saleTime?.toString(),
      expiryTime: sale.expiryTime ? sale.expiryTime.toString() : undefined,
      notes: sale.notes,
    }));
  } catch (error) {
    console.error("Error fetching sales:", error);
    return [];
  }
}

export default async function AllCoursesPage({
  searchParams,
}: {
  searchParams: { search?: string; sort?: string; order?: string };
}) {
  const searchQuery = searchParams.search || null;
  const sortBy = searchParams.sort || "createdAt";
  const sortOrder = searchParams.order || "desc";

  // Fetch courses
  const courses = await getAllCourses(searchQuery, sortBy, sortOrder);

  // Fetch enrollment counts and sales for each course
  const courseIds = courses.map((c: CourseType) => c._id);
  const sales = await getActiveSales(courseIds);

  const coursesWithEnrollment: CourseWithEnrollment[] = await Promise.all(
    courses.map(async (course: CourseMapped): Promise<CourseWithEnrollment> => {
      const enrollmentCount: number = await getEnrollmentCount(course._id);
      const sale = getSaleForCourse(sales, course._id);
      return {
        ...course,
        enrollmentCount,
        sale,
      };
    })
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">All Courses</h1>
          <p className="text-muted-foreground mt-2">
            Browse our collection of {coursesWithEnrollment.length} courses
            taught by expert instructors
          </p>
        </div>

        {/* Search form with debounce (client component) */}
        <div className="w-full md:w-auto">
          <Suspense fallback={null}>
            <DebouncedSearchInput
              defaultValue={searchQuery || ""}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
          </Suspense>
        </div>
      </div>

      {/* Sorting options */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { label: "Newest", value: "createdAt" },
          { label: "Price", value: "price" },
          { label: "Name", value: "name" },
        ].map((sort) => (
          <Badge
            key={sort.value}
            variant={sortBy === sort.value ? "default" : "outline"}
            className="cursor-pointer"
          >
            <Link
              href={`/courses?sort=${sort.value}&order=${
                sortBy === sort.value && sortOrder === "desc" ? "asc" : "desc"
              }${
                searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""
              }`}
              className="flex items-center"
            >
              {sort.label}
              {sortBy === sort.value &&
                (sortOrder === "desc" ? (
                  <SortDesc className="ml-1 h-3 w-3" />
                ) : (
                  <SortAsc className="ml-1 h-3 w-3" />
                ))}
            </Link>
          </Badge>
        ))}
      </div>

      {coursesWithEnrollment.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coursesWithEnrollment.map((course) => (
            <Card
              key={course._id}
              className="flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow relative"
            >
              <div className="aspect-video relative bg-muted">
                <Image
                  src={
                    course.imageUrl ||
                    `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(
                      course.name
                    )}`
                  }
                  alt={course.name}
                  fill
                  className="object-cover"
                />
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-xl line-clamp-2">
                  {course.name}
                </CardTitle>
                <div className="flex items-center text-sm text-muted-foreground">
                  <span>By {course.teacher.name}</span>
                </div>
              </CardHeader>

              <CardContent className="flex-grow">
                <p className="text-muted-foreground line-clamp-3 mb-4">
                  {course.description}
                </p>

                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    <Clock className="mr-1 h-3 w-3" /> {course.duration}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="mr-1 h-3 w-3" />{" "}
                    {new Date(course.createdAt).toLocaleDateString()}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Users className="mr-1 h-3 w-3" />{" "}
                    {course.enrollmentCount} enrolled
                  </Badge>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between items-center border-t pt-4">
                <div className="font-bold text-lg">
                  {course.sale ? (
                    <>
                      <SalePriceBlock sale={course.sale} price={course.price} />
                      <SaleTimer expiryTime={course.sale.expiryTime} />
                    </>
                  ) : course.price === 0 ? (
                    "Free"
                  ) : (
                    `₹${course.price}`
                  )}
                </div>
                <Link href={`/courses/${course._id}`}>
                  <Button>View Course</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg">
          <h2 className="text-xl font-medium mb-2">No courses found</h2>
          {searchQuery ? (
            <p className="text-muted-foreground mb-6">
              No courses match your search criteria. Try different keywords or
              browse all courses.
            </p>
          ) : (
            <p className="text-muted-foreground mb-6">
              No courses are available at the moment. Please check back later.
            </p>
          )}
          {searchQuery && (
            <Link href="/courses">
              <Button>View All Courses</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}