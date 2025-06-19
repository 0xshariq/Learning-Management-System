import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Terms of Service | Learning Management System",
  description: "Terms and conditions for using our learning platform.",
}

export default function TermsPage() {
  return (
    <div className="flex justify-center items-center min-h-screen py-12">
      <div className="container max-w-4xl px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: May 6, 2024</p>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none">
              <p>
                Please read these Terms of Service (&quot;Terms&quot;, &quot;Terms of Service&quot;) carefully before using our website and
                services.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">1. Agreement to Terms</h2>
              <p>
                By accessing or using our platform, you agree to be bound by these Terms. If you disagree with any part
                of the terms, you may not access the service.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">2. Intellectual Property</h2>
              <p>
                The Service and its original content, features, and functionality are and will remain the exclusive
                property of our company and its licensors. The Service is protected by copyright, trademark, and other
                laws. Our trademarks may not be used in connection with any product or service without the prior written
                consent.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">3. User Accounts</h2>
              <p>
                When you create an account with us, you must provide information that is accurate, complete, and current
                at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate
                termination of your account on our Service.
              </p>
              <p>
                You are responsible for safeguarding the password that you use to access the Service and for any
                activities or actions under your password.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">4. Course Content</h2>
              <p>
                All course content provided through our platform is for educational purposes only. We do not guarantee
                the accuracy, completeness, or usefulness of any information provided in the courses.
              </p>
              <p>
                You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly
                perform, republish, download, store, or transmit any of the material on our platform, except as
                permitted by these Terms or with the prior written consent of the content owner.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">5. Payments and Refunds</h2>
              <p>
                Payment for courses must be made in advance. We use third-party payment processors and do not store your
                payment information.
              </p>
              <p>
                Refunds are subject to the specific refund policy of each course, which will be clearly stated on the
                course page before purchase.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">6. Termination</h2>
              <p>
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason
                whatsoever, including without limitation if you breach the Terms.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">7. Limitation of Liability</h2>
              <p>
                In no event shall our company, nor its directors, employees, partners, agents, suppliers, or affiliates,
                be liable for any indirect, incidental, special, consequential or punitive damages, including without
                limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access
                to or use of or inability to access or use the Service.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">8. Changes to Terms</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a
                revision is material we will try to provide at least 30 days notice prior to any new terms taking
                effect.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">9. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us at{" "}
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
