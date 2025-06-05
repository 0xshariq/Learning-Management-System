"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  ClapperboardIcon as ChalkboardTeacher,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RolePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("signin");
  const [adminExists, setAdminExists] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if admin exists
    const checkAdmin = async () => {
      try {
        const response = await fetch("/api/auth/admin-exists");
        const data = await response.json();
        setAdminExists(data.exists);
      } catch (error) {
        console.error("Failed to check admin status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, []);

  const handleRoleSelect = (role: string) => {
    if (role === "admin" && adminExists && activeTab === "signup") {
      toast({
        title: "Admin Already Exists",
        description: "Only one admin account is allowed in the system.",
        variant: "destructive",
      });
      return;
    }

    if (activeTab === "signin") {
      router.push(`/${role}/signin`);
    } else {
      router.push(`/${role}/signup`);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen py-12">
      <div className="container max-w-md px-4">
        <Tabs
          defaultValue="signin"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Sign In</CardTitle>
                <CardDescription>Choose your role to sign in</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => handleRoleSelect("student")}
                >
                  <BookOpen className="mr-2 h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Student</div>
                    <div className="text-xs text-muted-foreground">
                      Access courses and track your progress
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => handleRoleSelect("teacher")}
                >
                  <ChalkboardTeacher className="mr-2 h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Teacher</div>
                    <div className="text-xs text-muted-foreground">
                      Create and manage your courses
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => handleRoleSelect("admin")}
                >
                  <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Admin</div>
                    <div className="text-xs text-muted-foreground">
                      Manage the entire platform
                    </div>
                  </div>
                </Button>
              </CardContent>
              <CardFooter className="flex justify-center">
                <p className="text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Button
                    onClick={() => setActiveTab("signup")}
                    className="text-primary underline cursor-pointer"
                  >
                    Sign up
                  </Button>
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="signup">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Create an Account</CardTitle>
                <CardDescription>Choose your role to sign up</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => handleRoleSelect("student")}
                >
                  <BookOpen className="mr-2 h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Student</div>
                    <div className="text-xs text-muted-foreground">
                      Learn new skills and enroll in courses
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => handleRoleSelect("teacher")}
                >
                  <ChalkboardTeacher className="mr-2 h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Teacher</div>
                    <div className="text-xs text-muted-foreground">
                      Share your knowledge and earn money
                    </div>
                  </div>
                </Button>
                {(!adminExists || isLoading) && (
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-4"
                    onClick={() => handleRoleSelect("admin")}
                    disabled={isLoading}
                  >
                    <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-medium">Admin</div>
                      <div className="text-xs text-muted-foreground">
                        Set up the platform administration
                      </div>
                    </div>
                  </Button>
                )}
              </CardContent>
              <CardFooter className="flex justify-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Button
                    onClick={() => setActiveTab("signin")}
                    className="text-primary underline cursor-pointer"
                  >
                    Sign in
                  </Button>
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
