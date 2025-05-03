"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function BaselineManual() {
  const router = useRouter()
  const { toast } = useToast()
  const [mode, setMode] = useState<"upload" | "edit">("upload")
  const [userId, setUserId] = useState<string | null>(null)
  const [text, setText] = useState("")
  const [originalText, setOriginalText] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [hasEdited, setHasEdited] = useState(false)
  const [taskStartTime, setTaskStartTime] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ユーザー認証チェック
  useEffect(() => {
    const storedUserId = localStorage.getItem("userId")
    if (!storedUserId) {
      router.push("/login")
    } else {
      setUserId(storedUserId)
    }
  }, [router])

  // テキストエリアの高さを自動調整する関数
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  // テキストが変更されたときに高さを調整
  useEffect(() => {
    setTimeout(adjustTextareaHeight, 0)
  }, [text])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userId) return

    // プレビュー表示
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    setIsUploading(true)
    setApiError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('user_id', userId)

      const response = await fetch('http://localhost:8000/api/generate-description', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setText(result.description)
        setOriginalText(result.description)
      } else {
        const errorMessage = `説明文の生成に失敗しました: ${result.error}`
        setApiError(errorMessage)
        toast({
          title: "エラー",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`
      setApiError(errorMessage)
      toast({
        title: "エラー",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setText(newText)
    setHasEdited(newText !== originalText)
    adjustTextareaHeight()
  }

  // 編集モードに移行する際の処理
  const handleStartEdit = () => {
    const startTime = new Date().toISOString()
    setTaskStartTime(startTime)
    console.log("start time: " + startTime)
    localStorage.setItem('taskStartTime', startTime)
    setMode("edit")
  }

  // タスク完了時の処理
  const handleComplete = () => {
    const endTime = new Date().toISOString()
    const startTime = taskStartTime || localStorage.getItem('taskStartTime')

    if (startTime) {
      localStorage.setItem('taskEndTime', endTime)
      console.log("end time: " + endTime)
      const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime()
      const durationSeconds = Math.floor(durationMs / 1000)
      localStorage.setItem('taskDuration', durationSeconds.toString())
    }

    router.push("/complete")
  }

  if (!userId) {
    return null
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="text-sm font-semibold text-gray-800">
            {mode === "upload"
              ? "商品画像をアップロードすると、AIが商品説明文を生成します。"
              : "商品説明文を編集してください。"}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mode === "upload" ? (
              <>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="imageInput"
                  />
                  <div className="space-y-4">
                    <Button
                      onClick={() => document.getElementById('imageInput')?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          画像をアップロード中...
                        </>
                      ) : (
                        '商品画像を選択'
                      )}
                    </Button>
                    {imagePreview && (
                      <div className="mt-4">
                        <img
                          src={imagePreview}
                          alt="プレビュー"
                          className="max-w-[200px] max-h-[150px] mx-auto rounded-lg object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">商品説明文：</p>
                  <Textarea
                    ref={textareaRef}
                    placeholder="ここに商品説明が表示されます..."
                    className="min-h-[7.5em] overflow-hidden"
                    value={text}
                    readOnly
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleStartEdit}
                    variant={text ? "default" : "secondary"}
                    className={text 
                      ? "bg-blue-600 hover:bg-blue-700 transition-colors" 
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"}
                    disabled={!text}
                  >
                    編集に進む
                  </Button>
                </div>
              </>
            ) : (
              <>
                {imagePreview && (
                  <div className="text-center mb-4">
                    <img
                      src={imagePreview}
                      alt="商品画像"
                      className="max-w-[200px] max-h-[150px] mx-auto rounded-lg object-contain"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">商品説明文：</p>
                  <Textarea
                    ref={textareaRef}
                    placeholder="ここに商品説明が表示されます..."
                    className="min-h-[7.5em] resize-y"
                    value={text}
                    onChange={handleTextChange}
                  />
                </div>

                <div className="flex justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant={hasEdited ? "default" : "secondary"}
                        className={hasEdited 
                          ? "bg-blue-600 hover:bg-blue-700 transition-colors" 
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"}
                        disabled={!hasEdited}
                      >
                        編集完了
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader className="flex items-center">
                        <AlertDialogTitle className="text-center">タスクを終了しますか？</AlertDialogTitle>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex justify-center gap-2 sm:justify-center">
                        <AlertDialogCancel className="mt-0">キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleComplete}
                          className="bg-blue-600 hover:bg-blue-700 mt-0"
                        >
                          完了する
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}

            {apiError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
