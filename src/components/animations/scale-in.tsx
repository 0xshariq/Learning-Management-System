"use client"

import type React from "react"

import { useEffect, useRef } from "react"
import { motion, useInView, useAnimation } from "framer-motion"

interface ScaleInProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  className?: string
  once?: boolean
  initialScale?: number
}

export function ScaleIn({
  children,
  delay = 0,
  duration = 0.5,
  className = "",
  once = true,
  initialScale = 0.9,
}: ScaleInProps) {
  const controls = useAnimation()
  const ref = useRef(null)
  const isInView = useInView(ref, { once })

  useEffect(() => {
    if (isInView) {
      controls.start("visible")
    }
  }, [controls, isInView])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: initialScale }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: initialScale }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1.0] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
