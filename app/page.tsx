"use client"

import { useState, useRef, useEffect } from "react"
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
  const { toast } = useToast()
  const [mode, setMode] = useState<"edit" | "correction">("edit")
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

  const audioRecorderRef = useRef<RealtimeAudioRecorder | null>(null)
  const accumulatedTranscriptRef = useRef<string>("")

  // AudioRecorderの初期化
  useEffect(() => {
    audioRecorderRef.current = new RealtimeAudioRecorder()

    audioRecorderRef.current.onTranscript((text, isFinal) => {
      // リアルタイムで文字起こしを更新
      if (text) {
        handleTranscriptReceived(text, isFinal)
      }
    })

    audioRecorderRef.current.onError((error) => {
      console.error("Recording error:", error)
      setRecordingError(`録音エラー: ${error.message}`)
      stopRecording()
    })

    return () => {
      if (audioRecorderRef.current?.isActive()) {
        audioRecorderRef.current.stop()
      }
    }
  }, [])

  // 文字起こし結果を処理する関数
  const handleTranscriptReceived = async (newTranscript: string, isFinal: boolean) => {
    // 現在の文字起こしを表示
    setTranscript(newTranscript)

    // 最終結果の場合のみ処理
    if (isFinal) {
      // 文字起こしを蓄積
      accumulatedTranscriptRef.current += " " + newTranscript

      // フィードバックかどうかをチェック
      setIsCheckingFeedback(true)
      try {
        const containsFeedback = await isFeedback(accumulatedTranscriptRef.current, text)

        if (containsFeedback) {
          // フィードバックが含まれている場合、処理を開始
          processUserFeedback(accumulatedTranscriptRef.current)
          // 蓄積をリセット
          accumulatedTranscriptRef.current = ""
        } else {
          // フィードバックではない場合、蓄積を続ける
          console.log("Accumulated transcript (not feedback yet):", accumulatedTranscriptRef.current)
        }
      } catch (error) {
        console.error("Error checking feedback:", error)
      } finally {
        setIsCheckingFeedback(false)
      }
    }
  }

  const toggleMode = () => {
    if (mode === "correction") {
      // 修正モードから編集モードに切り替える場合は録音を停止
      stopRecording()
      setMode("edit")
    } else {
      // 編集モードから修正モードに切り替える場合
      setMode("correction")
      // 修正モードに切り替えたら自動的に録音を開始
      setTimeout(() => startRecording(), 100) // 少し遅延させて状態の更新を確実にする
    }
    setRecordingError(null)
    setApiError(null)
    setShowComparison(false)
    setSuggestion(null)
    accumulatedTranscriptRef.current = ""
  }

  const startRecording = async () => {
    try {
      setRecordingError(null)
      setApiError(null)
      setTranscript("")
      setSuggestion(null)
      accumulatedTranscriptRef.current = ""

      if (audioRecorderRef.current) {
        await audioRecorderRef.current.start()
        setIsRecording(true)
        console.log("Recording started")
      }
    } catch (error) {
      console.error("Failed to start recording:", error)
      if (error instanceof Error) {
        setRecordingError(`録音開始エラー: ${error.message}`)
      } else {
        setRecordingError("録音を開始できませんでした")
      }
      toast({
        title: "エラー",
        description: "録音を開始できませんでした。",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (audioRecorderRef.current?.isActive()) {
      audioRecorderRef.current.stop()
      console.log("Recording stopped")

      // 蓄積した文字起こしがあれば処理
      if (accumulatedTranscriptRef.current.trim()) {
        handleTranscriptReceived(accumulatedTranscriptRef.current, true)
      }
    }

    setIsRecording(false)
  }

  const processUserFeedback = async (feedback: string) => {
    if (!feedback.trim() || !text.trim()) return

    setIsProcessing(true)
    setApiError(null)

    try {
      // 元のテキストを保存
      setOriginalText(text)

      // 修正提案を生成
      const suggestionText = await generateCorrectionSuggestion(text, feedback)
      setSuggestion(suggestionText)

      // 修正を適用
      const result = await applyCorrectionSuggestion(text, suggestionText, feedback)

      // 修正後のテキストを設定
      setText(result)

      // 比較セクションを表示
      setShowComparison(true)

      setTranscript("")
    } catch (error: any) {
      console.error("Error processing correction:", error)

      // APIエラーメッセージを設定
      setApiError(error.message || "テキストの処理中にエラーが発生しました")

      toast({
        title: "エラーが発生しました",
        description: error.message || "テキストの処理中にエラーが発生しました。もう一度お試しください。",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleComparison = () => {
    setShowComparison(!showComparison)
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>メルカリ商品説明ジェネレーター</CardTitle>
            <Button variant={mode === "edit" ? "outline" : "default"} onClick={toggleMode}>
              {mode === "edit" ? "修正モードに切り替え" : "編集モードに切り替え"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
                  value={suggestion}
                  readOnly
                  className="min-h-[80px] bg-blue-50 text-blue-800 border-blue-200"
                />
              </div>
            )}

            <div className="relative">
              {mode === "edit" ? (
                <Textarea
                  placeholder="ここに商品説明を入力してください..."
                  className="min-h-[200px]"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              ) : (
                <div className="border rounded-md p-3 min-h-[200px] bg-white">
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
                          <div className="text-xs font-medium mb-1 text-red-800">編集前</div>
                          <div className="whitespace-pre-wrap break-words text-sm">
                            {originalText || <span className="text-muted-foreground">元のテキストはありません</span>}
                          </div>
                        </div>
                        <div className="p-3 bg-green-50">
                          <div className="text-xs font-medium mb-1 text-green-800">編集後</div>
                          <div className="whitespace-pre-wrap break-words text-sm">
                            {text || <span className="text-muted-foreground">編集後のテキストはありません</span>}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="unified" className="p-0">
                      <div className="p-3">
                        <div className="text-xs font-medium mb-2">変更点</div>
                        {originalText === text ? (
                          <div className="text-sm text-muted-foreground">変更はありません</div>
                        ) : (
                          <div className="text-sm">
                            {originalText.split("\n").map((line, i) => (
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

            <div className="text-sm text-muted-foreground">
              {mode === "edit"
                ? "編集モード: テキストを直接入力してください。"
                : "修正モード: 音声でフィードバックを提供すると、AIが文章を修正します。"}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
