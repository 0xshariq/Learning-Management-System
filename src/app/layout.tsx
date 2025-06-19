import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/lib/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/theme-provider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/navbar-breadcrumb";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduLearn - Learning Management System (LMS)",
  authors: [
    {
      name: "EduLearn Team",
      url: "",
    },
  ],
  keywords: [
    "LMS",
    "Learning Management System",
    "Online Education",
    "E-Learning",
    "Course Management",
    "Student Portal",
    "Teacher Portal",
    "Education Platform",
    "EduLearn",
  ],
  description:
    "A modern platform for online education. Learn, teach, and grow with us.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <Breadcrumbs />
              {children}
              <Footer />
            </div>
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
