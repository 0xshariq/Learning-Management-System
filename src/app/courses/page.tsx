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
  Search,
  SortAsc,
  SortDesc,
} from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import { Course } from "@/models/course";

interface Teacher {
  _id: string;
  name: string;
  email: string;
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
// Function to get all courses with sorting and filtering
async function getAllCourses(
  searchQuery?: string | null,
  sortBy = "createdAt",
  sortOrder = "desc"
) {
  await dbConnect();

  try {
    // Build query
    const query: {
      isPublished: boolean;
      $or?: {
        name?: { $regex: string; $options: string };
        description?: { $regex: string; $options: string };
      }[];
    } = { isPublished: true };

    // Add search functionality if query provided
    if (searchQuery) {
      query.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
      ];
    }

    // Determine sort direction
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    // Create sort object
    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sortBy] = sortDirection;

    // Execute query with populated teacher field
    const courses = await Course.find(query)
      .populate("teacher", "name email")
      .sort(sortOptions)
      .lean();

    // Convert MongoDB documents to plain objects and stringify ObjectIds

    return courses.map(
      (course): CourseMapped => ({
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
        createdAt: course.createdAt.toISOString(),
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

// Function to count students enrolled in a course
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

export default async function AllCoursesPage({
  searchParams,
}: {
  searchParams: { search?: string; sort?: string; order?: string };
}) {
  // Get query parameters
  const searchQuery = searchParams.search || null;
  const sortBy = searchParams.sort || "createdAt";
  const sortOrder = searchParams.order || "desc";

  // Fetch courses
  const courses = await getAllCourses(searchQuery, sortBy, sortOrder);

  // Fetch enrollment counts for each course
  const coursesWithEnrollment: CourseWithEnrollment[] = await Promise.all(
    courses.map(async (course: CourseMapped): Promise<CourseWithEnrollment> => {
      const enrollmentCount: number = await getEnrollmentCount(course._id);
      return { ...course, enrollmentCount };
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

        {/* Search form */}
        <div className="w-full md:w-auto">
          <form className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                name="search"
                placeholder="Search courses..."
                defaultValue={searchQuery || ""}
                className="pl-9 h-10 w-full md:w-[250px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
        </div>
      </div>

      {/* Sorting options */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge
          variant={sortBy === "createdAt" ? "default" : "outline"}
          className="cursor-pointer"
        >
          <Link
            href={`/courses/all?sort=createdAt&order=${
              sortOrder === "asc" ? "desc" : "asc"
            }`}
            className="flex items-center"
          >
            Newest
            {sortBy === "createdAt" &&
              (sortOrder === "desc" ? (
                <SortDesc className="ml-1 h-3 w-3" />
              ) : (
                <SortAsc className="ml-1 h-3 w-3" />
              ))}
          </Link>
        </Badge>
        <Badge
          variant={sortBy === "price" ? "default" : "outline"}
          className="cursor-pointer"
        >
          <Link
            href={`/courses/all?sort=price&order=${
              sortOrder === "asc" ? "desc" : "asc"
            }`}
            className="flex items-center"
          >
            Price
            {sortBy === "price" &&
              (sortOrder === "desc" ? (
                <SortDesc className="ml-1 h-3 w-3" />
              ) : (
                <SortAsc className="ml-1 h-3 w-3" />
              ))}
          </Link>
        </Badge>
        <Badge
          variant={sortBy === "name" ? "default" : "outline"}
          className="cursor-pointer"
        >
          <Link
            href={`/courses/all?sort=name&order=${
              sortOrder === "asc" ? "desc" : "asc"
            }`}
            className="flex items-center"
          >
            Name
            {sortBy === "name" &&
              (sortOrder === "desc" ? (
                <SortDesc className="ml-1 h-3 w-3" />
              ) : (
                <SortAsc className="ml-1 h-3 w-3" />
              ))}
          </Link>
        </Badge>
      </div>

      {coursesWithEnrollment.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coursesWithEnrollment.map((course: CourseWithEnrollment) => (
            <Card
              key={course._id}
              className="flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow"
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
                    <Users className="mr-1 h-3 w-3" /> {course.enrollmentCount}{" "}
                    enrolled
                  </Badge>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between items-center border-t pt-4">
                <div className="font-bold text-lg">₹{course.price}</div>
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
            <Link href="/courses/all">
              <Button>View All Courses</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
