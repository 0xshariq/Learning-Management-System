"use client";

import { useEffect, useRef } from "react";
import { motion, useInView, useAnimation, type Variants } from "framer-motion";

interface TextRevealProps {
  text: string;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  element?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
}

export function TextReveal({
  text,
  delay = 0,
  duration = 0.05,
  className = "",
  once = true,
}: // element = "p", // Remove unused variable
TextRevealProps) {
  const controls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once });

  const words = text.split(" ");

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: duration, delayChildren: delay },
    },
  };

  const child: Variants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
  };

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [controls, isInView]);

  return (
    <motion.div
      ref={ref}
      style={{ overflow: "hidden" }}
      variants={container}
      initial="hidden"
      animate={controls}
      className={className}
      aria-label={text}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          style={{ display: "inline-block", marginRight: "0.25em" }}
          variants={child}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}
