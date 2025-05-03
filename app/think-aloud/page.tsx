"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Loader2, AlertCircle, ArrowDown, ArrowUp } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RealtimeAudioRecorder } from "@/lib/realtime-audio-recorder"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function ThinkAloud() {
  const router = useRouter()
  const { toast } = useToast()
  const [mode, setMode] = useState<"upload" | "edit" | "correction">("upload")
  const [userId, setUserId] = useState<string | null>(null)
  const [text, setText] = useState("")
  const [originalText, setOriginalText] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [taskStartTime, setTaskStartTime] = useState<string | null>(null)
  const [hasModification, setHasModification] = useState(false)
  const suggestionTextareaRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const audioRecorderRef = useRef<RealtimeAudioRecorder | null>(null)

  const [history, setHistory] = useState<Array<{ utterance: string; edit_plan: string; modified_text: string }>>([])

  // ユーザー認証チェック
  useEffect(() => {
    const storedUserId = localStorage.getItem("userId")
    if (!storedUserId) {
      router.push("/login")
    } else {
      setUserId(storedUserId)
    }
  }, [router])

  // AudioRecorderの初期化
  useEffect(() => {
    audioRecorderRef.current = new RealtimeAudioRecorder()

    audioRecorderRef.current.onMessage((data) => {
      const receivedTime = new Date().toISOString()
      console.log(`[${receivedTime}] Received message from backend:`, data.type, data)

      // バッチ処理でステート更新を行う
      if (data.type === 'edit_plan' || data.type === 'no_edit_needed') {
        Promise.resolve().then(() => {
          setSuggestion(data.edit_plan)
          setTranscript(data.utterance)
          if (!originalText && data.original_text) {
            setOriginalText(data.original_text)
          }
          if (data.history_summary) {
            console.log(`[${receivedTime}] Current constraints:`, data.history_summary)
          }
        })
      } else if (data.type === 'modification_complete') {
        Promise.resolve().then(() => {
          setText(data.modified_text)
          setTranscript(data.utterance)
          if (!originalText && data.original_text) {
            setOriginalText(data.original_text)
          }
          setHistory(data.history)
          if (data.history_summary) {
            console.log(`[${receivedTime}] Updated constraints:`, data.history_summary)
          }
          setHasModification(true)
        })
      } else {
        console.log(`[${receivedTime}] Received unexpected message type:`, data.type)
      }
    })

    audioRecorderRef.current.onError((error) => {
      console.error("WebSocket error:", error)
      setRecordingError(`WebSocket接続エラーが発生しました。バックエンドサーバーが起動しているか確認してください。`)
      stopRecording()
      toast({
        title: "WebSocketエラー",
        description: "バックエンドとの接続に失敗しました。",
        variant: "destructive",
      })
    })

    return () => {
      if (audioRecorderRef.current?.isActive()) {
        audioRecorderRef.current.stop()
      }
    }
  }, [])

  // テキストエリアの高さを自動調整する関数
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  // テキストが変更されたときに高さを自動調整
  useEffect(() => {
    setTimeout(adjustTextareaHeight, 0)
  }, [text])

  // モードが変更されたときにも高さを調整
  useEffect(() => {
    if (mode === "upload") {
      setTimeout(adjustTextareaHeight, 0)
    }
  }, [mode])

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

  const handleStartEdit = async () => {
    try {
      if (!userId) {
        throw new Error("ユーザーIDが見つかりません")
      }

      if (!text) {
        throw new Error("テキストが入力されていません")
      }

      const startTime = new Date().toISOString()
      setTaskStartTime(startTime)
      localStorage.setItem('taskStartTime', startTime)
      console.log("start time: " + startTime)

      // テキストをバックエンドに送信
      const response = await fetch("http://localhost:8000/api/display-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          user_id: userId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "サーバーエラーが発生しました")
      }

      const data = await response.json()
      setOriginalText(data.text)

      // モードを変更し、録音を開始
      setMode("correction")
      await startRecording()
    } catch (error) {
      console.error("Error starting edit:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast({
        title: "エラー",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

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

  const startRecording = async () => {
    try {
      setRecordingError(null)
      setApiError(null)

      if (audioRecorderRef.current && userId) {
        await audioRecorderRef.current.start(userId)
        setIsRecording(true)
        console.log("WebSocket connection initiated")
      }
    } catch (error) {
      console.error("Failed to start WebSocket connection:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setRecordingError(errorMessage)
      toast({
        title: "録音エラー",
        description: errorMessage,
        variant: "destructive",
      })
      setIsRecording(false)
    }
  }

  const stopRecording = async () => {
    try {
      if (!audioRecorderRef.current) {
        throw new Error("録音機能が初期化されていません")
      }

      await audioRecorderRef.current.stop()
      setIsRecording(false)
    } catch (error) {
      console.error("Error stopping recording:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast({
        title: "録音エラー",
        description: errorMessage,
        variant: "destructive",
      })
      setIsRecording(false)
    }
  }

  // 直前のテキストを取得する関数
  const getPreviousText = () => {
    if (history.length >= 2) {
      return history[history.length - 2].modified_text
    }
    return originalText
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
              : "思考発話を元にAIが文章を修正提案をします。"}
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

                <div className="flex flex-col space-y-2">
                  {recordingError && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{recordingError}</AlertDescription>
                    </Alert>
                  )}

                  <p className="text-sm font-medium mb-2">あなたの発話：</p>
                  <div className="bg-muted p-3 rounded-md text-sm">
                    <p className="whitespace-pre-wrap break-words">{transcript || ""}</p>
                  </div>

                  {apiError && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{apiError}</AlertDescription>
                    </Alert>
                  )}

                  {isProcessing && (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>処理中...</span>
                    </div>
                  )}

                  <p className="text-sm font-medium mb-2">修正提案：</p>
                  <Textarea
                    ref={suggestionTextareaRef}
                    value={suggestion || ""}
                    readOnly
                    className="bg-blue-50 text-blue-800 border-blue-200 min-h-[3em]"
                  />
                </div>

                <div className="relative">
                  <p className="text-sm font-medium mb-2">商品説明文：</p>
                  <div className="border rounded-md p-3 min-h-[7.5em] bg-white whitespace-pre-wrap break-words">
                    {text || <span className="text-muted-foreground">ここに商品説明が表示されます...</span>}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium">変更履歴：</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowComparison(!showComparison)}
                      className="h-8 px-2"
                    >
                      {showComparison ? (
                        <>
                          <ArrowUp className="h-4 w-4 mr-1" />
                          非表示
                        </>
                      ) : (
                        <>
                          <ArrowDown className="h-4 w-4 mr-1" />
                          表示
                        </>
                      )}
                    </Button>
                  </div>
                  {showComparison && (
                    <div className="border rounded-md overflow-hidden">
                      <div className="grid grid-cols-2 divide-x">
                        <div className="p-3 bg-red-50">
                          <div className="text-xs font-medium mb-1 text-red-800">直前のテキスト</div>
                          <div className="whitespace-pre-wrap break-words text-sm">
                            {getPreviousText() || <span className="text-muted-foreground">直前のテキストはありません</span>}
                          </div>
                        </div>
                        <div className="p-3 bg-green-50">
                          <div className="text-xs font-medium mb-1 text-green-800">現在のテキスト</div>
                          <div className="whitespace-pre-wrap break-words text-sm">
                            {text || <span className="text-muted-foreground">現在のテキストはありません</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant={hasModification ? "default" : "secondary"}
                        className={hasModification 
                          ? "bg-blue-600 hover:bg-blue-700 transition-colors" 
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"}
                        disabled={!hasModification}
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
