# EduLearn - Learning Management System

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Purpose & Vision](#purpose--vision)
- [Technology Stack](#technology-stack)
- [Project Architecture](#project-architecture)
- [Database Models](#database-models)
- [Authentication System](#authentication-system)
- [Course Management](#course-management)
- [Payment System](#payment-system)
- [Refund Management](#refund-management)
- [Sales & Discount System](#sales--discount-system)
- [User Management](#user-management)
- [Admin Panel](#admin-panel)
- [API Endpoints](#api-endpoints)
- [Security Features](#security-features)
- [Installation & Setup](#installation--setup)

---

## 🎯 Project Overview

EduLearn is a Learning Management System (LMS) built with Next.js 14 and modern web technologies. It provides a platform for online education with role-based access for students, teachers, and administrators.

### Key Features
- **Role-Based Access Control**: Separate interfaces for Students, Teachers, and Admins
- **Payment Processing**: Integrated with Razorpay for course purchases
- **Refund System**: Automated refund processing with approval workflows
- **Dynamic Pricing**: Sales and coupon management
- **User Management**: Complete admin panel for user oversight

---

## 🎯 Purpose & Vision

### Primary Goals
1. **Online Education Platform**: Enable teachers to create and sell courses
2. **Student Learning Hub**: Provide students with course access and progress tracking
3. **Administrative Control**: Complete platform management through admin panel
4. **Secure Transactions**: Handle payments and refunds securely

### Target Users
- **Students**: Purchase and access courses
- **Teachers**: Create, manage, and sell courses
- **Administrators**: Oversee platform operations and user management

---

## 🛠️ Technology Stack

### Frontend Technologies
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Shadcn/UI Components**
- **Lucide React Icons**

### Backend Technologies
- **Next.js API Routes**
- **MongoDB with Mongoose**
- **NextAuth.js for Authentication**
- **Razorpay for Payments**

### Development Tools
- **ESLint & Prettier**
- **TypeScript Compiler**
- **Environment Variables**

---

## 🏗️ Project Architecture

### Folder Structure
```
learning-management-system/
├── email-templates/            # Email Templates 
├── public/                     # Static assets
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth-protected routes
│   │   │   ├── admin/         # Admin panel pages
│   │   │   ├── student/       # Student dashboard
│   │   │   └── teacher/       # Teacher dashboard
│   │   ├── api/               # Backend API Routes
│   │   │   ├── admin/         # Admin operations
│   │   │   ├── auth/          # Authentication
│   │   │   ├── courses/       # Course CRUD
│   │   │   ├── coupons/       # Coupon management
│   │   │   ├── payments/      # Payment processing
│   │   │   ├── refund/        # Refund processing
│   │   │   ├── request-refund/ # Refund requests
│   │   │   └── sales/         # Sales management
│   │   ├── refund/            # Refund UI pages
│   │   └── globals.css        # Global styles
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Shadcn UI components
│   │   └── animations/       # Animation components
│   ├── lib/                  # Utility libraries
│   │   ├── auth.ts          # NextAuth configuration
│   │   ├── dbConnect.ts     # MongoDB connection
│   │   └── utils.ts         # Helper functions
│   ├── models/              # Mongoose schemas
│   │   ├── admin.ts
│   │   ├── coupon.ts
│   │   ├── course.ts
│   │   ├── payment.ts
│   │   ├── refund.ts
│   │   ├── request-refund.ts
│   │   ├── sales.ts
│   │   ├── student.ts
│   │   └── teacher.ts
│   └── types/               # TypeScript definitions
├── middleware.ts            # Next.js middleware
└── package.json            # Dependencies
```

---

## 🗃️ Database Models

### User Models

#### Student Model
```typescript
{
  name: String,                    // Full name
  email: String,                   // Unique email
  password: String,                // Hashed password
  role: "student",                 // User role
  purchasedCourses: [ObjectId],    // Course references
  isActive: Boolean,               // Account status
  createdAt: Date,
  updatedAt: Date
}
```

#### Teacher Model
```typescript
{
  name: String,                    // Full name
  email: String,                   // Unique email
  password: String,                // Hashed password
  role: "teacher",                 // User role
  coursesCreated: [ObjectId],      // Created courses
  isActive: Boolean,               // Account status
  createdAt: Date,
  updatedAt: Date
}
```

#### Admin Model
```typescript
{
  name: String,                    // Full name
  email: String,                   // Unique email
  password: String,                // Hashed password
  role: "admin",                   // User role
  isActive: Boolean,               // Account status
  createdAt: Date,
  updatedAt: Date
}
```

### Course & Transaction Models

#### Course Model
```typescript
{
  name: String,                    // Course title
  description: String,             // Course description
  price: Number,                   // Course price
  teacher: ObjectId,               // Teacher reference
  category: String,                // Course category
  level: String,                   // Difficulty level
  thumbnail: String,               // Course image
  isPublished: Boolean,            // Publication status
  totalStudents: Number,           // Enrollment count
  totalRevenue: Number,            // Total earnings
  createdAt: Date,
  updatedAt: Date
}
```

#### Payment Model
```typescript
{
  student: ObjectId,               // Student reference
  course: ObjectId,                // Course reference
  amount: Number,                  // Payment amount
  razorpayPaymentId: String,       // Razorpay payment ID
  razorpayOrderId: String,         // Razorpay order ID
  status: String,                  // Payment status
  createdAt: Date,
  updatedAt: Date
}
```

#### Sales Model
```typescript
{
  teacher: ObjectId,               // Teacher reference
  course: ObjectId,                // Course reference
  amount: Number,                  // Sale price
  saleTime: Date,                  // Sale start time
  expiryTime: Date,                // Sale end time
  createdAt: Date,
  updatedAt: Date
}
```

#### Coupon Model
```typescript
{
  code: String,                    // Coupon code
  discountPercentage: Number,      // Percentage discount
  discountAmount: Number,          // Fixed discount
  expiresAt: Date,                 // Expiry date
  course: ObjectId,                // Course reference (optional)
  createdBy: ObjectId,             // Creator reference
  isActive: Boolean,               // Coupon status
  createdAt: Date,
  updatedAt: Date
}
```

#### Refund Models
```typescript
// Refund Request
{
  courseId: ObjectId,              // Course reference
  studentId: ObjectId,             // Student reference
  amount: Number,                  // Refund amount
  reason: String,                  // Refund reason
  refundReasonCategory: String,    // Category
  requestStatus: String,           // pending/accepted/rejected
  createdAt: Date,
  updatedAt: Date
}

// Processed Refund
{
  courseId: ObjectId,              // Course reference
  studentId: ObjectId,             // Student reference
  amount: Number,                  // Refund amount
  refundId: String,                // Razorpay refund ID
  status: String,                  // Refund status
  refundMethod: String,            // Refund method
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔐 Authentication System

### Features
- **NextAuth.js Integration**: Secure authentication
- **Role-Based Access**: Student, Teacher, Admin roles
- **Protected Routes**: Middleware-based route protection
- **Session Management**: JWT-based sessions

### Implementation
```typescript
// Role-based route protection in middleware
export function middleware(request: NextRequest) {
  // Check authentication and redirect based on role
  // Protect /admin/* routes for admins only
  // Protect /teacher/* routes for teachers only
  // Protect /student/* routes for students only
}
```

---

## 📚 Course Management

### Features
- **Course Creation**: Teachers can create courses
- **Course Publishing**: Draft and published states
- **Course Pricing**: Dynamic pricing with sales
- **Student Enrollment**: After successful payment

### API Endpoints
```bash
GET  /api/courses              # Get all courses
POST /api/courses              # Create new course (teacher)
GET  /api/courses/[id]         # Get specific course
PUT  /api/courses/[id]         # Update course (teacher)
```

---

## 💳 Payment System

### Features
- **Razorpay Integration**: Secure payment processing
- **Order Creation**: Generate payment orders
- **Payment Verification**: Signature verification
- **Course Enrollment**: Automatic after payment

### Payment Flow
1. Student selects course
2. System creates Razorpay order
3. Student completes payment
4. Payment verification
5. Course access granted

### API Endpoints
```bash
POST /api/payments/create-order  # Create payment order
POST /api/payments/verify        # Verify payment
```

---

## 🔄 Refund Management

### Features
- **Refund Requests**: Students can request refunds
- **Admin Approval**: Admin reviews and approves/rejects
- **Automated Processing**: Direct Razorpay refund processing
- **Course Access Removal**: Automatic after refund

### Refund Process
1. Student submits refund request
2. Admin reviews request
3. If approved, automatic refund processing
4. Course access revoked
5. Student notified

### API Endpoints
```bash
POST /api/request-refund         # Submit refund request
GET  /api/request-refund         # Get refund requests (admin)
POST /api/refund                 # Process approved refund
```

---

## 🏷️ Sales & Discount System

### Features
- **Time-Based Sales**: Limited-time price reductions
- **Coupon System**: Discount codes for courses
- **Dynamic Pricing**: Automatic price calculations

### Implementation
```typescript
// Sales management
POST /api/sales                  # Create sale (teacher)
GET  /api/sales                  # Get active sales

// Coupon management  
POST /api/coupons                # Create coupon (teacher)
POST /api/coupons/validate       # Validate coupon code
```

---

## 👥 User Management

### Admin Features
- **User Listing**: View all students, teachers, admins
- **Account Suspension**: Suspend/activate user accounts
- **Profile Viewing**: Access user profiles
- **Course Oversight**: View teacher courses

### Student Features
- **Course Purchase**: Buy courses with payment
- **Course Access**: View purchased courses
- **Refund Requests**: Request refunds for courses

### Teacher Features
- **Course Creation**: Create and manage courses
- **Sales Management**: Create sales and coupons
- **Revenue Tracking**: View earnings and analytics

---

## 🛡️ Admin Panel

### Administrative Features
- **User Management**: Suspend/activate accounts, view profiles
- **Course Oversight**: Monitor all courses on platform
- **Refund Management**: Review and process refund requests
- **Platform Analytics**: User and course statistics

### Admin Routes
```bash
/admin/dashboard                 # Admin dashboard
/admin/users                     # User management
/admin/users/profile/[id]        # User profile view
/admin/courses/teacher/[id]      # Teacher's courses
```

---

## 🔗 API Endpoints

### Authentication
```bash
GET  /api/auth/[...nextauth]     # NextAuth endpoints
```

### Courses
```bash
GET    /api/courses              # List courses
POST   /api/courses              # Create course
GET    /api/courses/[id]         # Get course details
PUT    /api/courses/[id]         # Update course
DELETE /api/courses/[id]         # Delete course
```

### Payments
```bash
POST /api/payments  # Create payment order
POST /api/payments/verify        # Verify payment
```

### Refunds
```bash
POST /api/request-refund         # Request refund
GET  /api/request-refund         # Get requests (admin)
POST /api/refund                 # Process refund
```

### Admin
```bash
GET  /api/admin/users            # Get all users
PUT  /api/admin/users/[id]       # Update user status
```

### Sales & Coupons
```bash
POST /api/sales                  # Create sale
GET  /api/sales                  # Get sales
POST /api/coupons                # Create coupon
POST /api/coupons/validate       # Validate coupon
```

---

## 🔒 Security Features

### Implemented Security
- **Input Validation**: Zod schema validation
- **Authentication**: NextAuth.js with JWT
- **Role-Based Access**: Route and API protection
- **Payment Security**: Razorpay signature verification
- **Environment Variables**: Sensitive data protection

---

## 🚀 Installation & Setup

### Prerequisites
```bash
- Node.js (v18 or higher)
- MongoDB database
- npm or pnpm package manager
```

### Environment Variables
```env
MONGODB_URI=your-mongodb-connection-string
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

### Installation Steps
```bash
# 1. Clone the repository
git clone https://github.com/0xshariq/learning-management-system.git
cd learning-management-system

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# 4. Run the development server
npm run dev

# 5. Open browser
# Navigate to http://localhost:3000
```

### Production Deployment
```bash
# Build the application
npm run build

# Start production server
npm start
```

---

## 📄 License & Contact

### License
This project is licensed under the MIT License.

### Contact Information
- **Email**: khanshariq92213@gmail.com
- **Live Demo**: https://learning-management-system-taupe-eta.vercel.app/
- **GitHub**: https://github.com/0xshariq/edulearn-lms

---

*This documentation covers the actual features implemented in the EduLearn Learning Management System. Refer to the source code for detailed implementation.*