"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface UseTypewriterOptions {
  /** Characters to reveal per tick */
  chunkSize?: number
  /** Milliseconds between each tick */
  speed?: number
}

interface UseTypewriterReturn {
  /** The text to display (progressively revealed) */
  displayText: string
  /** Whether the animation is still running */
  isAnimating: boolean
  /** Skip to the end immediately */
  skip: () => void
}

/**
 * Hook that progressively reveals text character-by-character.
 * Uses time-based calculation so animation continues even when the
 * browser tab is in the background (no reliance on setInterval which
 * gets throttled by the browser).
 */
export function useTypewriter(
  fullText: string,
  enabled: boolean,
  options: UseTypewriterOptions = {}
): UseTypewriterReturn {
  const { chunkSize = 3, speed = 12 } = options

  const [displayLength, setDisplayLength] = useState(enabled ? 0 : fullText.length)
  const [isAnimating, setIsAnimating] = useState(enabled)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const fullTextRef = useRef(fullText)

  // Keep ref in sync
  fullTextRef.current = fullText

  // Start animation when enabled and text is available
  useEffect(() => {
    if (!enabled) {
      setDisplayLength(fullText.length)
      setIsAnimating(false)
      return
    }

    // Start from 0 when first enabled with text
    if (fullText.length > 0 && displayLength === 0) {
      setIsAnimating(true)
      startTimeRef.current = performance.now()

      const animate = (now: number) => {
        const elapsed = now - (startTimeRef.current ?? now)
        // Calculate how many characters should be visible based on real elapsed time
        // Each "tick" of `speed` ms reveals `chunkSize` characters
        const charsToShow = Math.floor((elapsed / speed) * chunkSize)
        const targetLength = Math.min(charsToShow, fullTextRef.current.length)

        if (targetLength >= fullTextRef.current.length) {
          // Animation complete
          setDisplayLength(fullTextRef.current.length)
          setIsAnimating(false)
          rafRef.current = null
          return
        }

        setDisplayLength(targetLength)
        rafRef.current = requestAnimationFrame(animate)
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
    // Only run on mount/enabled change, not on every displayLength change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fullText.length > 0])

  // If text changes and we're done animating, update to full length
  useEffect(() => {
    if (!isAnimating) {
      setDisplayLength(fullText.length)
    }
  }, [fullText, isAnimating])

  const skip = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setDisplayLength(fullTextRef.current.length)
    setIsAnimating(false)
  }, [])

  return {
    displayText: fullText.slice(0, displayLength),
    isAnimating,
    skip,
  }
}
