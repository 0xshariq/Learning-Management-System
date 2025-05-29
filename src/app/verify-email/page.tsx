"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, Mail, Loader2 } from "lucide-react"
import Link from "next/link"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isVerifying, setIsVerifying] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)

  const token = searchParams.get("token")
  const role = searchParams.get("role")

  useEffect(() => {
    if (!token || !role) {
      setError("Invalid verification link")
      setIsVerifying(false)
      return
    }

    verifyEmail()
  }, [token, role])

  async function verifyEmail() {
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, role }),
      })

      const result = await response.json()

      if (response.ok) {
        setIsVerified(true)
        toast({
          title: "Email Verified!",
          description: result.message,
        })
      } else {
        setError(result.error || "Verification failed")
      }
    } catch (error) {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  async function resendVerification() {
    if (!role) return

    setIsResending(true)
    try {
      // We need email for resending, but we don't have it from URL
      // This would need to be handled differently in a real app
      toast({
        title: "Info",
        description: "Please request a new verification email from the sign-in page.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend verification email",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  if (isVerifying) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="w-12 h-12 mx-auto text-primary mb-4 animate-spin" />
            <CardTitle className="text-2xl">Verifying Email</CardTitle>
            <CardDescription>Please wait while we verify your email address...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (isVerified) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <CardTitle className="text-2xl text-green-600">Email Verified!</CardTitle>
            <CardDescription>
              Your email has been successfully verified. You can now sign in to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href={`/${role}/signin`}>
              <Button className="w-full">Continue to Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <CardTitle className="text-2xl text-red-600">Verification Failed</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={resendVerification} disabled={isResending} className="w-full" variant="outline">
            {isResending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Resending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Resend Verification Email
              </>
            )}
          </Button>
          <Link href="/role">
            <Button variant="ghost" className="w-full">
              Back to Role Selection
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
