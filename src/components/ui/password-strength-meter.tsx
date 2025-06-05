"use client"

import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordStrengthMeterProps {
  password: string
  className?: string
}

interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
  met: boolean
}

// Improved strength calculation with scoring
function calculateStrength(password: string): { score: number; level: string } {
  let score = 0

  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1 // bonus for longer passwords
  if (/[A-Z]/.test(password)) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1 // any non-alphanumeric

  // Level assignment
  if (score <= 2) return { score, level: "Weak" }
  if (score <= 4) return { score, level: "Fair" }
  if (score <= 6) return { score, level: "Good" }
  return { score, level: "Strong" }
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const requirements: PasswordRequirement[] = [
    {
      label: "At least 8 characters",
      test: (pwd) => pwd.length >= 8,
      met: password.length >= 8,
    },
    {
      label: "Contains uppercase letter",
      test: (pwd) => /[A-Z]/.test(pwd),
      met: /[A-Z]/.test(password),
    },
    {
      label: "Contains lowercase letter",
      test: (pwd) => /[a-z]/.test(pwd),
      met: /[a-z]/.test(password),
    },
    {
      label: "Contains number",
      test: (pwd) => /\d/.test(pwd),
      met: /\d/.test(password),
    },
    {
      label: "Contains special character",
      test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
    {
      label: "12+ characters (bonus)",
      test: (pwd) => pwd.length >= 12,
      met: password.length >= 12,
    },
  ]

  const metRequirements = requirements.filter((req) => req.met).length
  const { score, level } = calculateStrength(password)
  const strengthPercentage = Math.min((score / 7) * 100, 100)

  const getStrengthInfo = () => {
    switch (level) {
      case "Weak":
        return { label: "Weak", color: "bg-red-500", textColor: "text-red-600" }
      case "Fair":
        return { label: "Fair", color: "bg-orange-500", textColor: "text-orange-600" }
      case "Good":
        return { label: "Good", color: "bg-yellow-500", textColor: "text-yellow-600" }
      case "Strong":
        return { label: "Strong", color: "bg-green-500", textColor: "text-green-600" }
      default:
        return { label: "Enter password", color: "bg-gray-200", textColor: "text-gray-500" }
    }
  }

  const strengthInfo = password ? getStrengthInfo() : { label: "Enter password", color: "bg-gray-200", textColor: "text-gray-500" }

  if (!password) return null

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Password Strength</span>
          <span className={cn("text-sm font-medium", strengthInfo.textColor)}>{strengthInfo.label}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={cn("h-2 rounded-full transition-all duration-300", strengthInfo.color)}
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>

      <div className="space-y-1">
        {requirements.map((requirement) => (
          <div key={requirement.label} className="flex items-center gap-2 text-sm">
            {requirement.met ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
            <span className={cn(requirement.met ? "text-green-600" : "text-gray-500")}>{requirement.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}