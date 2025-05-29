import { Resend } from "resend"
import {
  generateForgotPasswordEmail,
  generateResetPasswordSuccessEmail,
  generateEmailVerificationEmail,
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

    const { data, error } = await resend.emails.send({
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

    const { data, error } = await resend.emails.send({
      from: "EduLearn <noreply@edulearn.com>",
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

// Function to send email verification
export async function sendVerificationEmail(email: string, verificationToken: string, role: string, userName = "User") {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}&role=${role}`

  try {
    const htmlContent = generateEmailVerificationEmail({
      userName,
      userEmail: email,
      userRole: role.charAt(0).toUpperCase() + role.slice(1),
      verificationUrl,
      isStudent: role === "student",
      isTeacher: role === "teacher",
      isAdmin: role === "admin",
    })

    const { data, error } = await resend.emails.send({
      from: "EduLearn <noreply@edulearn.com>",
      to: email,
      subject: "📧 Verify Your EduLearn Account",
      html: htmlContent,
    })

    if (error) {
      console.error("Error sending verification email:", error)
      throw new Error("Failed to send verification email")
    }

    return { success: true }
  } catch (error) {
    console.error("Error sending verification email:", error)
    throw new Error("Failed to send verification email")
  }
}

// Function to send 2FA setup email
export async function send2FASetupEmail(email: string, qrCodeUrl: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: "EduLearn <noreply@edulearn.com>",
      to: email,
      subject: "🔐 Two-Factor Authentication Setup - EduLearn",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4f46e5; margin: 0;">🎓 EduLearn</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h2 style="color: white; margin: 0;">🔐 Two-Factor Authentication</h2>
          </div>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #166534;">Your 2FA has been successfully set up!</p>
            <p style="color: #166534;">Use your authenticator app to scan the QR code and generate tokens.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <img src="${qrCodeUrl}" alt="2FA QR Code" style="max-width: 200px; border: 2px solid #e5e7eb; border-radius: 8px;">
          </div>
          
          <div style="background: #eff6ff; border: 1px solid #3b82f6; padding: 15px; border-radius: 8px;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">💡 Keep your authenticator app safe and secure!</p>
          </div>
        </div>
      `,
    })

    if (error) {
      throw new Error("Failed to send 2FA setup email")
    }

    return { success: true, data }
  } catch (error) {
    console.error("2FA email error:", error)
    throw new Error("2FA email service unavailable")
  }
}
