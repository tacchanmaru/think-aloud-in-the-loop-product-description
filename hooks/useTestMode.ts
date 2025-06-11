"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"

export function usePracticeMode() {
  const [isPracticeMode, setIsPracticeMode] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const practiceParam = searchParams.get("practice")
    setIsPracticeMode(practiceParam !== null)
  }, [searchParams])

  return isPracticeMode
}

// Backward compatibility
export const useTestMode = usePracticeMode 