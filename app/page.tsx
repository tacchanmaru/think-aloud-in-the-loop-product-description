"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Loader2, AlertCircle, ArrowDown, ArrowUp } from "lucide-react"
import { isFeedback, generateCorrectionSuggestion, applyCorrectionSuggestion } from "@/lib/ai-helpers"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RealtimeAudioRecorder } from "@/lib/realtime-audio-recorder"

export default function Home() {
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
  const [isCheckingFeedback, setIsCheckingFeedback] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const suggestionTextareaRef = useRef<HTMLTextAreaElement>(null)

  const audioRecorderRef = useRef<RealtimeAudioRecorder | null>(null)
  const accumulatedTranscriptRef = useRef<string>("")

  const [history, setHistory] = useState<Array<{ utterance: string; edit_plan: string; modified_text: string }>>([])
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

  // AudioRecorderの初期化
  useEffect(() => {
    audioRecorderRef.current = new RealtimeAudioRecorder()

    audioRecorderRef.current.onMessage((data) => {
      console.log("Received data from backend:", data)
      if (data.type === 'edit_plan') {
        // 修正プランを先に表示
        setSuggestion(data.edit_plan)
        setTranscript(data.utterance)
        // 元のテキストがなければ設定（初回など）
        if (!originalText && data.original_text) {
          setOriginalText(data.original_text)
        }
        // history_summaryをコンソールに表示
        if (data.history_summary) {
          console.log("Current constraints:", data.history_summary)
        }
      } else if (data.type === 'modification_complete') {
        // 修正完了時の処理
        setText(data.modified_text)
        setTranscript(data.utterance)
        // 元のテキストがなければ設定（初回など）
        if (!originalText && data.original_text) {
          setOriginalText(data.original_text)
        }
        // 履歴を保存
        setHistory(data.history)
        // history_summaryをコンソールに表示
        if (data.history_summary) {
          console.log("Updated constraints:", data.history_summary)
        }
        // 比較セクションを表示
        setShowComparison(true)
      } else {
        // 必要に応じて他のメッセージタイプも処理
        console.log("Received unexpected message type:", data.type)
      }
    })

    audioRecorderRef.current.onError((event) => {
      console.error("WebSocket error:", event)
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
  }, [originalText]) // originalTextを依存配列に追加

  // 文字起こし結果を処理する関数 (バックエンド処理に変更したため不要)
  // const handleTranscriptReceived = async (newTranscript: string, isFinal: boolean) => { ... }

  const toggleMode = async () => {
    try {
      if (!userId) {
        throw new Error("ユーザーIDが見つかりません")
      }

      if (!text) {
        throw new Error("テキストが入力されていません")
      }

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
      
      // 現在のモードを確認して切り替え
      const newMode = mode === "edit" ? "correction" : "edit"
      setMode(newMode)

      // 修正モードに切り替える場合は WebSocket を初期化
      if (newMode === "correction") {
        // 既存の WebSocket 接続を閉じる
        if (audioRecorderRef.current?.isActive()) {
          await audioRecorderRef.current.stop()
        }
        // 新しい WebSocket 接続を初期化
        audioRecorderRef.current = new RealtimeAudioRecorder()
        audioRecorderRef.current.onMessage((data) => {
          console.log("Received data from backend:", data)
          if (data.type === 'edit_plan') {
            setSuggestion(data.edit_plan)
            setTranscript(data.utterance)
            if (!originalText && data.original_text) {
              setOriginalText(data.original_text)
            }
            if (data.history_summary) {
              console.log("Current constraints:", data.history_summary)
            }
          } else if (data.type === 'modification_complete') {
            setText(data.modified_text)
            setTranscript(data.utterance)
            if (!originalText && data.original_text) {
              setOriginalText(data.original_text)
            }
            setHistory(data.history)
            if (data.history_summary) {
              console.log("Updated constraints:", data.history_summary)
            }
            setShowComparison(true)
          } else {
            console.log("Received unexpected message type:", data.type)
          }
        })

        audioRecorderRef.current.onError((event) => {
          console.error("WebSocket error:", event)
          setRecordingError(`WebSocket接続エラーが発生しました。バックエンドサーバーが起動しているか確認してください。`)
          stopRecording()
          toast({
            title: "WebSocketエラー",
            description: "バックエンドとの接続に失敗しました。",
            variant: "destructive",
          })
        })
      }
    } catch (error) {
      console.error("Error toggling mode:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast({
        title: "エラー",
        description: errorMessage,
        variant: "destructive",
      })
    }
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

  // processUserFeedback はバックエンドで行われるため不要
  // const processUserFeedback = async (feedback: string) => { ... }

  const toggleComparison = () => {
    setShowComparison(!showComparison)
  }

  // Add auto-resize effect for suggestion textarea
  useEffect(() => {
    if (suggestionTextareaRef.current && suggestion) {
      suggestionTextareaRef.current.style.height = 'auto'
      suggestionTextareaRef.current.style.height = `${suggestionTextareaRef.current.scrollHeight}px`
    }
  }, [suggestion])

  // 直前のテキストを取得する関数
  const getPreviousText = () => {
    if (history.length >= 2) {
      return history[history.length - 2].modified_text
    }
    return originalText
  }

  // テキストエリアの高さを自動調整する関数
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  // テキストが変更されたとき、またはモードが変更されたときに高さを調整
  useEffect(() => {
    // 編集モードの場合のみ高さを調整
    if (mode === "edit") {
      // 少し遅延を入れて実行（DOMの更新後に確実に実行されるようにするため）
      setTimeout(adjustTextareaHeight, 0)
    }
  }, [text, mode])

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
        // バックエンドに現在のテキストを送信
        const textResponse = await fetch('http://localhost:8000/api/display-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            text: result.description,
            user_id: userId,
          }),
        })

        if (textResponse.ok) {
          setMode('edit')
        } else {
          const errorMessage = "テキストの設定に失敗しました"
          setApiError(errorMessage)
          toast({
            title: "エラー",
            description: errorMessage,
            variant: "destructive",
          })
        }
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

  // ログアウト処理を追加
  const handleLogout = () => {
    localStorage.removeItem("userId")
    router.push("/login")
  }

  if (!userId) {
    return null // または loading spinner
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>メルカリ商品説明ジェネレーター</CardTitle>
            {mode !== "upload" && (
              <Button variant={mode === "edit" ? "outline" : "default"} onClick={toggleMode}>
                {mode === "edit" ? "修正モードに切り替え" : "編集モードに切り替え"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mode === "upload" ? (
              <div className="space-y-4">
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
                          className="max-w-[300px] mx-auto rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
                {apiError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{apiError}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <>
                {imagePreview && (
                  <div className="text-center mb-4">
                    <img
                      src={imagePreview}
                      alt="商品画像"
                      className="max-w-[300px] mx-auto rounded-lg"
                    />
                  </div>
                )}

                {mode === "correction" && (
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={isRecording ? "bg-red-100" : ""}>
                        {isRecording ? "音声認識中..." : "録音停止中"}
                        {isCheckingFeedback && " (フィードバック判定中...)"}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={isRecording ? stopRecording : startRecording}>
                        {isRecording ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                        {isRecording ? "録音停止" : "録音開始"}
                      </Button>
                    </div>

                    {recordingError && (
                      <Alert variant="destructive" className="py-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{recordingError}</AlertDescription>
                      </Alert>
                    )}

                    {transcript && (
                      <div className="bg-muted p-3 rounded-md text-sm">
                        <p className="font-semibold mb-1">あなたの発話:</p>
                        <p className="whitespace-pre-wrap break-words">{transcript}</p>
                      </div>
                    )}

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
                  </div>
                )}

                {suggestion && mode === "correction" && (
                  <div className="mb-4">
                    <div className="text-sm font-medium mb-2">修正提案:</div>
                    <Textarea
                      ref={suggestionTextareaRef}
                      value={suggestion}
                      readOnly
                      className="bg-blue-50 text-blue-800 border-blue-200 min-h-[120px]"
                    />
                  </div>
                )}

                <div className="relative">
                  {mode === "edit" ? (
                    <Textarea
                      ref={textareaRef}
                      placeholder="ここに商品説明を入力してください..."
                      className="min-h-[200px] overflow-hidden"
                      value={text}
                      onChange={(e) => {
                        setText(e.target.value)
                        adjustTextareaHeight()
                      }}
                    />
                  ) : (
                    <div className="border rounded-md p-3 min-h-[200px] bg-white whitespace-pre-wrap break-words">
                      {text || <span className="text-muted-foreground">ここに商品説明が表示されます...</span>}
                    </div>
                  )}
                </div>

                {showComparison && mode === "correction" && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-medium">変更内容</h3>
                      <Button variant="ghost" size="sm" onClick={toggleComparison}>
                        {showComparison ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="border rounded-md overflow-hidden">
                      <Tabs defaultValue="side-by-side" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="side-by-side">並べて表示</TabsTrigger>
                          <TabsTrigger value="unified">統合表示</TabsTrigger>
                        </TabsList>
                        <TabsContent value="side-by-side" className="p-0">
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
                        </TabsContent>
                        <TabsContent value="unified" className="p-0">
                          <div className="p-3">
                            <div className="text-xs font-medium mb-2">変更点</div>
                            {getPreviousText() === text ? (
                              <div className="text-sm text-muted-foreground">変更はありません</div>
                            ) : (
                              <div className="text-sm">
                                {getPreviousText().split("\n").map((line, i) => (
                                  <div key={`old-${i}`} className="bg-red-50 text-red-800 p-1 mb-1 rounded">
                                    - {line}
                                  </div>
                                ))}
                                {text.split("\n").map((line, i) => (
                                  <div key={`new-${i}`} className="bg-green-50 text-green-800 p-1 mb-1 rounded">
                                    + {line}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="text-sm text-muted-foreground">
              {mode === "upload"
                ? "商品画像をアップロードすると、AIが商品説明文を生成します。"
                : mode === "edit"
                ? "編集モード: テキストを直接入力してください。"
                : "修正モード: 音声でフィードバックを提供すると、AIが文章を修正します。"}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
