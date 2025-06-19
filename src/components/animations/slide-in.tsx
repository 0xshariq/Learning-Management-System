"use client"

import type React from "react"

import { useEffect, useRef } from "react"
import { motion, useInView, useAnimation } from "framer-motion"

interface SlideInProps {
  children: React.ReactNode
  direction?: "up" | "down" | "left" | "right"
  delay?: number
  duration?: number
  className?: string
  once?: boolean
  distance?: number
}

export function SlideIn({
  children,
  direction = "up",
  delay = 0,
  duration = 0.5,
  className = "",
  once = true,
  distance = 100,
}: SlideInProps) {
  const controls = useAnimation()
  const ref = useRef(null)
  const isInView = useInView(ref, { once })

  // Set initial and animate values based on direction
  const getDirectionValues = () => {
    switch (direction) {
      case "up":
        return { initial: { y: distance }, animate: { y: 0 } }
      case "down":
        return { initial: { y: -distance }, animate: { y: 0 } }
      case "left":
        return { initial: { x: distance }, animate: { x: 0 } }
      case "right":
        return { initial: { x: -distance }, animate: { x: 0 } }
      default:
        return { initial: { y: distance }, animate: { y: 0 } }
    }
  }

  const { initial, animate } = getDirectionValues()

  useEffect(() => {
    if (isInView) {
      controls.start("visible")
    }
  }, [controls, isInView])

  return (
    <motion.div
      ref={ref}
      initial={{ ...initial, opacity: 0 }}
      animate={isInView ? { ...animate, opacity: 1 } : { ...initial, opacity: 0 }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1.0] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
