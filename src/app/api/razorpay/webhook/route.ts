import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"



// Helper to read raw body in Next.js app router
async function getRawBody(req: NextRequest): Promise<Buffer> {
  const reader = req.body?.getReader()
  const chunks = []
  if (!reader) return Buffer.from([])
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return Buffer.concat(chunks)
}


export async function POST(req: NextRequest) {
  try {
    const rawBody = await getRawBody(req)
    const signature = req.headers.get("x-razorpay-signature")
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) {
      throw new Error("RAZORPAY_WEBHOOK_SECRET is not defined in environment variables")
    }
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex")

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }

    const payload = JSON.parse(rawBody.toString("utf8"))
    console.log("Webhook verified:", payload)

    if (payload.event === "payment.captured") {
      // ✅ Grant course access to user here
      // You can implement your logic here
    }

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 })
  }
}