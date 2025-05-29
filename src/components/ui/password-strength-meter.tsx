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
  ]

  const metRequirements = requirements.filter((req) => req.met).length
  const strengthPercentage = (metRequirements / requirements.length) * 100

  const getStrengthInfo = () => {
    if (metRequirements === 0) {
      return { label: "Enter password", color: "bg-gray-200", textColor: "text-gray-500" }
    } 
     if (metRequirements <= 2) {
      return { label: "Weak", color: "bg-red-500", textColor: "text-red-600" }
    } 
     if (metRequirements <= 3) {
      return { label: "Fair", color: "bg-orange-500", textColor: "text-orange-600" }
    }
    if (metRequirements <= 4) {
      return { label: "Good", color: "bg-yellow-500", textColor: "text-yellow-600" }
    }
    return { label: "Strong", color: "bg-green-500", textColor: "text-green-600" }
  }

  const strengthInfo = getStrengthInfo()

  if (!password) return null

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Password Strength</span>
          <span className={cn("text-sm font-medium", strengthInfo.textColor)}>{strengthInfo.label}</span>
        </div>
        <Progress
          value={strengthPercentage}
          className="h-2"
          style={{
            background: "#e5e7eb",
          }}
        />
        <style jsx>{`
          .progress-indicator {
            background-color: ${strengthInfo.color.replace("bg-", "")};
          }
        `}</style>
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

// Custom Progress component with dynamic colors
export function ColoredProgress({ value, strengthLevel }: { value: number; strengthLevel: string }) {
  const getProgressColor = () => {
    switch (strengthLevel) {
      case "Weak":
        return "bg-red-500"
      case "Fair":
        return "bg-orange-500"
      case "Good":
        return "bg-yellow-500"
      case "Strong":
        return "bg-green-500"
      default:
        return "bg-gray-200"
    }
  }

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={cn("h-2 rounded-full transition-all duration-300", getProgressColor())}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}
