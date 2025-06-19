"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Menu,
  X,
  User,
  LogOut,
  BookOpen,
  Settings,
  ChevronDown,
  BarChart3,
  Users,
  PlusCircle,
} from "lucide-react";

// Role-specific navigation configurations
const roleNavConfigs = {
  student: {
    mainNav: [
      { href: "/", label: "Home" },
      { href: "/courses/all", label: "Browse Courses" },
      { href: "/student/dashboard", label: "My Learning" },
    ],
    dropdownItems: [
      { href: "/student/profile", label: "Profile", icon: User },
      { href: "/student/dashboard", label: "My Courses", icon: BookOpen },
      { href: "/student/settings", label: "Settings", icon: Settings },
    ],
  },
  teacher: {
    mainNav: [
      { href: "/", label: "Home" },
      { href: "/courses/all", label: "Browse Courses" },
      { href: "/teacher/dashboard", label: "Dashboard" },
      { href: "/teacher/courses", label: "My Courses" },
    ],
    dropdownItems: [
      { href: "/teacher/profile", label: "Profile", icon: User },
      { href: "/teacher/courses", label: "My Courses", icon: BookOpen },
      {
        href: "/teacher/courses/create",
        label: "Create Course",
        icon: PlusCircle,
      },
      { href: "/teacher/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/teacher/settings", label: "Settings", icon: Settings },
    ],
  },
  admin: {
    mainNav: [
      { href: "/", label: "Home" },
      { href: "/admin/dashboard", label: "Dashboard" },
      { href: "/admin/users", label: "Users" },
      { href: "/admin/courses", label: "Courses" },
    ],
    dropdownItems: [
      { href: "/admin/profile", label: "Profile", icon: User },
      { href: "/admin/users", label: "Manage Users", icon: Users },
      { href: "/admin/courses", label: "Manage Courses", icon: BookOpen },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
};

const defaultNavConfig = {
  mainNav: [
    { href: "/", label: "Home" },
    { href: "/courses/all", label: "Courses" },
    { href: "/about", label: "About" },
  ],
  dropdownItems: [],
};

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  // Get role-specific navigation config
  const navConfig =
    session?.user?.role && status === "authenticated"
      ? roleNavConfigs[session.user.role as keyof typeof roleNavConfigs] ||
        defaultNavConfig
      : defaultNavConfig;

  // Removed getProfileLink to fix the eslint error

  const getDashboardLink = () => {
    if (!session?.user?.role) return "/role";
    return `/${session.user.role}/dashboard`;
  };

  // Only show user dropdown if authenticated and session exists
  const showUserDropdown = status === "authenticated" && !!session?.user;

  // Only show Sign In/Get Started if NOT authenticated and NOT loading
  const showAuthButtons = status !== "authenticated";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">EduLearn</span>
          </Link>
          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-6">
            {navConfig.mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(item.href) ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {showAuthButtons && (
            <div className="flex items-center gap-4">
              <Link href="/role">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/role">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          )}

          {showUserDropdown && (
            <div className="flex items-center gap-4">
              <Link href={getDashboardLink()} className="hidden md:block">
                <Button variant="outline" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={session.user?.image || ""}
                        alt={
                          session.user?.name ||
                          session.user?.email?.split("@")[0] ||
                          session.user?.role?.toUpperCase() ||
                          "User"
                        }
                      />
                      <AvatarFallback className="text-xs">
                        {session?.user?.name?.charAt(0) ||
                          session?.user?.email?.charAt(0)?.toUpperCase() ||
                          session?.user?.role?.charAt(0)?.toUpperCase() ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline">
                      {session?.user?.name ||
                        session?.user?.email?.split("@")[0] ||
                        session?.user?.role?.toUpperCase() ||
                        "User"}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{session.user?.name}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {session.user?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {navConfig.dropdownItems.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href} className="cursor-pointer">
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={toggleMenu}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container py-4">
            <nav className="flex flex-col space-y-4">
              {navConfig.mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    isActive(item.href)
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={toggleMenu}
                >
                  {item.label}
                </Link>
              ))}

              {showAuthButtons && (
                <div className="border-t pt-4 mt-4 space-y-2">
                  <Link
                    href="/role"
                    className="block text-sm font-medium transition-colors hover:text-primary text-muted-foreground"
                    onClick={toggleMenu}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/role"
                    className="block text-sm font-medium transition-colors hover:text-primary text-muted-foreground"
                    onClick={toggleMenu}
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {showUserDropdown && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user?.image || ""} />
                      <AvatarFallback className="text-xs">
                        {session.user?.name?.charAt(0) ||
                          session.user?.email?.charAt(0)?.toUpperCase() ||
                          session.user?.role?.charAt(0)?.toUpperCase() ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {session.user?.name ||
                          session.user?.email?.split("@")[0] ||
                          session.user?.role?.toUpperCase() ||
                          "User"}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {session.user?.role}
                      </p>
                    </div>
                  </div>
                  {navConfig.dropdownItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary text-muted-foreground py-2"
                      onClick={toggleMenu}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      signOut({ callbackUrl: "/" });
                      toggleMenu();
                    }}
                    className="w-full justify-start text-destructive hover:text-destructive mt-2"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
