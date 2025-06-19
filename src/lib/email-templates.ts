import fs from "node:fs"
import path from "node:path"

// Template replacement function
function replaceTemplateVariables(template: string, variables: Record<string, unknown>): string {
  let result = template

  // Replace simple variables like {{userName}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, "g")
    result = result.replace(regex, String(value))
  }

  // Handle conditional blocks like {{#if isStudent}}
  result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
    return variables[condition] ? content : ""
  })

  return result
}

// Load email template
function loadTemplate(templateName: string): string {
  const templatePath = path.join(process.cwd(), "email-templates", `${templateName}.html`)
  return fs.readFileSync(templatePath, "utf-8")
}

// Forgot Password Email
export function generateForgotPasswordEmail(variables: {
  userName: string
  userEmail: string
  userRole: string
  resetUrl: string
}): string {
  const template = loadTemplate("forgot-password")
  return replaceTemplateVariables(template, variables)
}

// Reset Password Success Email
export function generateResetPasswordSuccessEmail(variables: {
  userName: string
  userEmail: string
  userRole: string
  signInUrl: string
  dashboardUrl: string
}): string {
  const template = loadTemplate("reset-password-success")
  return replaceTemplateVariables(template, variables)
}
