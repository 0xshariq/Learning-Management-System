"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FadeIn, SlideIn, StaggerChildren } from "@/components/animations";
import { useCallback } from "react";

interface FAQ {
  question: string;
  answer: string;
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const fetchFAQs = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      const response = await fetch("/api/generate-faqs");

      if (!response.ok) {
        throw new Error(
          `Failed to fetch FAQs: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.faqs || !Array.isArray(data.faqs)) {
        throw new Error("Invalid response format");
      }

      setFaqs(data.faqs);

      // If using static FAQs due to an error, show the error
      if (data.source === "static" && data.error) {
        setError(`Using default FAQs: ${data.error}`);
      }
    } catch (err) {
      console.error("Error fetching FAQs:", err);
      setError(err instanceof Error ? err.message : "Failed to load FAQs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFAQs();
  }, [fetchFAQs]);

  return (
    <div className="container max-w-4xl py-12">
      <FadeIn>
        <div className="flex flex-col items-center text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Find answers to common questions about our learning platform. If you
            can&apos;t find what you&apos;re looking for, please contact our support team.
          </p>
        </div>
      </FadeIn>

      <SlideIn>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>FAQs</CardTitle>
              <CardDescription>
                Common questions about our platform
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFAQs}
              disabled={loading || refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              <span>Refresh Questions</span>
            </Button>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <StaggerChildren>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq) => (
                    <AccordionItem key={faq.question} value={faq.question}>
                      <AccordionTrigger className="text-left font-medium">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </StaggerChildren>
            )}
          </CardContent>
        </Card>
      </SlideIn>
    </div>
  );
}
