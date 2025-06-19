import { Resend } from "resend"
import {
  generateForgotPasswordEmail,
  generateResetPasswordSuccessEmail
} from "./email-templates"

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY)

// Function to send password reset email
export async function sendPasswordResetEmail(email: string, resetToken: string, role: string, userName = "User") {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${role}/reset-password?token=${resetToken}`

  try {
    const htmlContent = generateForgotPasswordEmail({
      userName,
      userEmail: email,
      userRole: role.charAt(0).toUpperCase() + role.slice(1),
      resetUrl,
    })

    const { error } = await resend.emails.send({
      from: "EduLearn <noreply@edulearn.com>",
      to: email,
      subject: "🔑 Reset Your EduLearn Password",
      html: htmlContent,
    })

    if (error) {
      console.error("Error sending reset email:", error)
      throw new Error("Failed to send password reset email")
    }

    return { success: true }
  } catch (error) {
    console.error("Error sending reset email:", error)
    throw new Error("Failed to send password reset email")
  }
}

// Function to send password reset success email
export async function sendPasswordResetSuccessEmail(email: string, role: string, userName = "User") {
  const signInUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${role}/signin`
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${role}/dashboard`

  try {
    const htmlContent = generateResetPasswordSuccessEmail({
      userName,
      userEmail: email,
      userRole: role.charAt(0).toUpperCase() + role.slice(1),
      signInUrl,
      dashboardUrl,
    })

    const { error } = await resend.emails.send({
      from: "EduLearn",
      to: email,
      subject: "✅ Password Reset Successful - EduLearn",
      html: htmlContent,
    })

    if (error) {
      console.error("Error sending success email:", error)
      throw new Error("Failed to send password reset success email")
    }

    return { success: true }
  } catch (error) {
    console.error("Error sending success email:", error)
    throw new Error("Failed to send password reset success email")
  }
}

