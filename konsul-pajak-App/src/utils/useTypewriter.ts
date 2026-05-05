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
 * Only animates when `enabled` is true (for new messages only, not history).
 */
export function useTypewriter(
  fullText: string,
  enabled: boolean,
  options: UseTypewriterOptions = {}
): UseTypewriterReturn {
  const { chunkSize = 3, speed = 12 } = options

  const [displayLength, setDisplayLength] = useState(enabled ? 0 : fullText.length)
  const [isAnimating, setIsAnimating] = useState(enabled)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
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

      timerRef.current = setInterval(() => {
        setDisplayLength((prev) => {
          const next = prev + chunkSize
          if (next >= fullTextRef.current.length) {
            // Animation complete
            if (timerRef.current) clearInterval(timerRef.current)
            setIsAnimating(false)
            return fullTextRef.current.length
          }
          return next
        })
      }, speed)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
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
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
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
