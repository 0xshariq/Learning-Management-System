import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Privacy Policy | Learning Management System",
  description: "Privacy policy for our learning platform.",
}

export default function PrivacyPage() {
  return (
    <div className="flex justify-center items-center min-h-screen py-12">
      <div className="container max-w-4xl px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: May 6, 2024</p>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none">
              <p>
                This Privacy Policy describes how we collect, use, and disclose your personal information when you use
                our learning platform.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">1. Information We Collect</h2>
              <p>
                <strong>Personal Information:</strong> When you register for an account, we collect your name, email
                address, and password. If you are a teacher, we may collect additional information such as your
                professional background and expertise.
              </p>
              <p>
                <strong>Payment Information:</strong> When you make a purchase, our payment processors collect payment
                information. We do not store your full credit card details on our servers.
              </p>
              <p>
                <strong>Usage Data:</strong> We collect information about how you interact with our platform, including
                courses viewed, videos watched, quiz results, and learning progress.
              </p>
              <p>
                <strong>Device Information:</strong> We collect information about the device you use to access our
                platform, including IP address, browser type, and operating system.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">2. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Track your learning progress and provide personalized recommendations</li>
                <li>Communicate with you about our services, updates, and promotional offers</li>
                <li>Respond to your comments, questions, and requests</li>
                <li>Monitor and analyze trends, usage, and activities in connection with our services</li>
                <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
              </ul>

              <h2 className="text-xl font-semibold mt-6 mb-3">3. Information Sharing and Disclosure</h2>
              <p>We may share your information with:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Service providers who perform services on our behalf</li>
                <li>Teachers, but only for students enrolled in their courses</li>
                <li>Third-party analytics providers</li>
                <li>As required by law or to protect our rights</li>
              </ul>
              <p>We do not sell your personal information to third parties.</p>

              <h2 className="text-xl font-semibold mt-6 mb-3">4. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information
                against unauthorized or unlawful processing, accidental loss, destruction, or damage.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">5. Your Rights</h2>
              <p>
                Depending on your location, you may have certain rights regarding your personal information, including:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Access to your personal information</li>
                <li>Correction of inaccurate or incomplete information</li>
                <li>Deletion of your personal information</li>
                <li>Restriction or objection to processing</li>
                <li>Data portability</li>
              </ul>
              <p>
                To exercise these rights, please contact us through our{" "}
                <Link href="/contact" className="text-primary hover:underline">
                  contact page
                </Link>
                .
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">6. Cookies and Tracking Technologies</h2>
              <p>
                We use cookies and similar tracking technologies to track activity on our platform and hold certain
                information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being
                sent.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">7. Children&apos;s Privacy</h2>
              <p>
                Our services are not intended for children under 13 years of age. We do not knowingly collect personal
                information from children under 13.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">8. Changes to This Privacy Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
                Privacy Policy on this page and updating the &quot;Last updated&quot; date.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">9. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at{" "}
                <Link href="/contact" className="text-primary hover:underline">
                  our contact page
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
