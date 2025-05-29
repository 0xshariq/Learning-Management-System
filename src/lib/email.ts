import { Resend } from "resend"

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY)

// Function to send password reset email
export async function sendPasswordResetEmail(email: string, resetToken: string, role: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${role}/reset-password?token=${resetToken}`

  try {
    const { data, error } = await resend.emails.send({
      from: "EduLearn <noreply@edulearn.com>",
      to: email,
      subject: "Reset Your EduLearn Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Reset Your Password</h2>
          <p>Hello,</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
          <p>Best regards,<br>The EduLearn Team</p>
        </div>
      `,
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

// Function to send 2FA setup email
export async function send2FASetupEmail(email: string, qrCodeUrl: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: "EduLearn <noreply@edulearn.com>",
      to: email,
      subject: "Set Up Two-Factor Authentication",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Two-Factor Authentication Setup</h2>
          <p>Hello,</p>
          <p>You've requested to set up two-factor authentication for your EduLearn account.</p>
          <p>Scan the QR code below with your authenticator app:</p>
          <div style="text-align: center; margin: 30px 0;">
            <img src="${qrCodeUrl}" alt="QR Code" style="max-width: 200px;" />
          </div>
          <p>If you can't scan the QR code, please contact support for assistance.</p>
          <p>Best regards,<br>The EduLearn Team</p>
        </div>
      `,
    })

    if (error) {
      console.error("Error sending 2FA setup email:", error)
      throw new Error("Failed to send 2FA setup email")
    }

    return { success: true }
  } catch (error) {
    console.error("Error sending 2FA setup email:", error)
    throw new Error("Failed to send 2FA setup email")
  }
}
