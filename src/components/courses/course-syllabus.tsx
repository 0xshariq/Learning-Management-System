"use client"

import { useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { BookOpen } from "lucide-react"

interface SyllabusWeek {
  title: string
  items: string[]
}

interface CourseSyllabusProps {
  syllabus: string
  formattedSyllabus?: string
}

// Helper function to parse syllabus string into SyllabusWeek[]
function parseSyllabus(syllabus: string): SyllabusWeek[] {
  const lines = syllabus.split(/\n+/)
  const parsedWeeks: SyllabusWeek[] = []
  let currentWeek: SyllabusWeek | null = null

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    // Check if line starts with "Week" or "Module"
    if (/^(Week|Module)\s+\d+/i.test(trimmedLine)) {
      if (currentWeek) {
        parsedWeeks.push(currentWeek)
      }
      currentWeek = { title: trimmedLine, items: [] }
    } else if (currentWeek) {
      currentWeek.items.push(trimmedLine)
    } else {
      // If no week has been defined yet, create a default one
      if (parsedWeeks.length === 0) {
        currentWeek = { title: "Week 1", items: [trimmedLine] }
      } else {
        parsedWeeks[parsedWeeks.length - 1].items.push(trimmedLine)
      }
    }
  }

  // Add the last week if it exists
  if (currentWeek && !parsedWeeks.includes(currentWeek)) {
    parsedWeeks.push(currentWeek)
  }

  return parsedWeeks.length > 0 ? parsedWeeks : [{ title: "Course Content", items: [syllabus] }]
}

export function CourseSyllabus({ syllabus, formattedSyllabus }: CourseSyllabusProps) {
  // Remove setWeeks to fix the eslint error
  const [weeks] = useState<SyllabusWeek[]>(() => {
    if (formattedSyllabus) {
      try {
        return JSON.parse(formattedSyllabus)
      } catch {
        // Fallback to parsing the regular syllabus
        console.error("Failed to parse formatted syllabus, falling back to regular syllabus parsing.")
        return parseSyllabus(syllabus)
      }
    }

    // Parse syllabus into weeks
    const lines = syllabus.split(/\n+/)
    const parsedWeeks: SyllabusWeek[] = []
    let currentWeek: SyllabusWeek | null = null

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      // Check if line starts with "Week" or "Module"
      if (/^(Week|Module)\s+\d+/i.test(trimmedLine)) {
        if (currentWeek) {
          parsedWeeks.push(currentWeek)
        }
        currentWeek = { title: trimmedLine, items: [] }
      } else if (currentWeek) {
        currentWeek.items.push(trimmedLine)
      } else {
        // If no week has been defined yet, create a default one
        if (parsedWeeks.length === 0) {
          currentWeek = { title: "Week 1", items: [trimmedLine] }
        } else {
          parsedWeeks[parsedWeeks.length - 1].items.push(trimmedLine)
        }
      }
    }

    // Add the last week if it exists
    if (currentWeek && !parsedWeeks.includes(currentWeek)) {
      parsedWeeks.push(currentWeek)
    }

    return parsedWeeks.length > 0 ? parsedWeeks : [{ title: "Course Content", items: [syllabus] }]
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-semibold">Course Syllabus</h3>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {weeks.map((week, index) => (
          <AccordionItem key={week.title} value={`week-${index}`}>
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <span className="font-medium">{week.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pl-10 space-y-2">
                {week.items.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}