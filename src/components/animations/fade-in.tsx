"use client"

import type React from "react"

import { useEffect, useRef } from "react"
import { motion, useInView, useAnimation } from "framer-motion"

interface FadeInProps {
  children: React.ReactNode
  direction?: "up" | "down" | "left" | "right" | "none"
  delay?: number
  duration?: number
  className?: string
  once?: boolean
}

export function FadeIn({
  children,
  direction = "up",
  delay = 0,
  duration = 0.5,
  className = "",
  once = true,
}: FadeInProps) {
  const controls = useAnimation()
  const ref = useRef(null)
  const isInView = useInView(ref, { once })

  // Set initial and animate values based on direction
  const getDirectionValues = () => {
    switch (direction) {
      case "up":
        return { initial: { y: 40 }, animate: { y: 0 } }
      case "down":
        return { initial: { y: -40 }, animate: { y: 0 } }
      case "left":
        return { initial: { x: 40 }, animate: { x: 0 } }
      case "right":
        return { initial: { x: -40 }, animate: { x: 0 } }
      case "none":
        return { initial: {}, animate: {} }
      default:
        return { initial: { y: 40 }, animate: { y: 0 } }
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
      initial={{ opacity: 0, ...initial }}
      animate={isInView ? { opacity: 1, ...animate } : { opacity: 0, ...initial }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
