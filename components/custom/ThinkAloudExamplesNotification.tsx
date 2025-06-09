"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, MessageSquare, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface ThinkAloudExamplesNotificationProps {
  examples: string[]
  onClose?: () => void
}

export default function ThinkAloudExamplesNotification({ 
  examples, 
  onClose 
}: ThinkAloudExamplesNotificationProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [previousExamplesLength, setPreviousExamplesLength] = useState(0)

  useEffect(() => {
    if (examples.length > 0) {
      setIsVisible(true)
      // 新しい例が追加された場合は自動的に展開する
      if (examples.length > previousExamplesLength && previousExamplesLength > 0) {
        setIsExpanded(true)
      }
      setPreviousExamplesLength(examples.length)
    } else {
      setIsVisible(false)
      setIsExpanded(false)
      setPreviousExamplesLength(0)
    }
  }, [examples, previousExamplesLength])

  const handleClose = () => {
    setIsVisible(false)
    setIsExpanded(false)
    setPreviousExamplesLength(0)
    onClose?.()
  }

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  if (!isVisible || examples.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 md:w-[28rem] lg:w-[32rem]">
      <Card className="shadow-lg border-2 border-blue-200 bg-blue-50 max-h-[calc(100vh-2rem)]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm text-blue-800">
                思考発話の例
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {examples.length}件
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleExpand}
                className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-[calc(100vh-8rem)] overflow-y-auto">
              {examples.map((example, index) => (
                <div
                  key={`${index}-${example.substring(0, 20)}`}
                  className="p-3 bg-white rounded border text-sm text-gray-700 hover:bg-gray-50 transition-colors leading-relaxed"
                >
                  <span className="font-medium text-blue-600 block mb-1">例{index + 1}:</span>
                  <span className="whitespace-pre-wrap break-words">{example}</span>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
} 