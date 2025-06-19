"use client"

import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordStrengthMeterProps {
  password: string
  className?: string
}

const BAD_PASSWORDS = [
  "123456", "password", "123456789", "12345678", "qwerty", "abc123", "111111", "123123", "password1"
]

const LEVELS = [
  { label: "Too Weak", color: "bg-red-500", textColor: "text-red-600", description: "Easily guessable" },
  { label: "Weak", color: "bg-orange-500", textColor: "text-orange-600", description: "Needs improvement" },
  { label: "Fair", color: "bg-yellow-500", textColor: "text-yellow-600", description: "Still guessable" },
  { label: "Good", color: "bg-lime-500", textColor: "text-lime-600", description: "Acceptable for most sites" },
  { label: "Strong", color: "bg-green-500", textColor: "text-green-600", description: "Very secure password" },
]

function calculateStrength(password: string): { score: number; level: number } {
  let score = 0

  if (BAD_PASSWORDS.includes(password.toLowerCase())) return { score: 0, level: 0 }

  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1 // any non-alphanumeric

  // Deduct for repeated characters (e.g. "aaaaaa")
  if (/^(.)\1+$/.test(password)) score = Math.max(score - 2, 0)

  // Map score to level (0-4)
  if (score <= 1) return { score, level: 0 }
  if (score === 2) return { score, level: 1 }
  if (score === 3) return { score, level: 2 }
  if (score === 4) return { score, level: 3 }
  return { score, level: 4 }
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const requirements = [
    {
      label: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      label: "Contains uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      label: "Contains lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      label: "Contains number",
      met: /\d/.test(password),
    },
    {
      label: "Contains special character",
      met: /[!@#$%^&*(),.?\":{}|<>]/.test(password),
    },
    {
      label: "Not a common password",
      met: !BAD_PASSWORDS.includes(password.toLowerCase()),
    },
    {
      label: "No repeated characters",
      met: !/^(.)\1+$/.test(password) || password.length < 3,
    },
  ]

  const { score, level } = calculateStrength(password)
  const strengthInfo = LEVELS[level]
  const strengthPercentage = Math.min((level / 4) * 100, 100)

  if (!password) return null

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Password Strength</span>
          <span className={cn("text-sm font-medium", strengthInfo.textColor)}>{strengthInfo.label}</span>
        </div>
        {/* Use Progress component for visual bar */}
        <Progress value={strengthPercentage} className="h-2" />
        <div className={cn("text-xs", strengthInfo.textColor)}>{strengthInfo.description}</div>
        <div className="text-xs text-gray-500">
          Strength Score: <span className="font-semibold">{score}</span>/7
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