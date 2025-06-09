"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"

export function useTestMode() {
  const [isTestMode, setIsTestMode] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const testParam = searchParams.get("test")
    setIsTestMode(testParam !== null)
  }, [searchParams])

  return isTestMode
} 