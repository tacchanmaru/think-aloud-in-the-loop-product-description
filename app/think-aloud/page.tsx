"use client"

import { useState, useRef, useEffect, ChangeEvent } from "react" // ChangeEvent を追加
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Loader2, AlertCircle, ArrowDown, ArrowUp } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RealtimeAudioRecorder } from "@/lib/realtime-audio-recorder" // 実際のパスに置き換えてください
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  // AlertDialogDescription, // 未使用
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import ProductImageUploadPhase from "@/components/custom/ProductImageUploadPhase"
import { getProductForExperiment, ExperimentPageType } from "@/lib/experimentUtils" // ★追加
import type { Product } from "@/lib/products" // ★追加

export default function ThinkAloud() {
  const router = useRouter()
  const { toast } = useToast()
  const [mode, setMode] = useState<"upload" | "correction">("upload") // "edit" は "correction" に統一
  const [userId, setUserId] = useState<string | null>(null)

  // Correctionフェーズで使用するstate
  const [textForCorrection, setTextForCorrection] = useState("")
  const [originalTextForCorrection, setOriginalTextForCorrection] = useState("")
  const [imagePreviewForCorrection, setImagePreviewForCorrection] = useState<string | null>(null)
  const [taskStartTime, setTaskStartTime] = useState<string | null>(null) // ProductImageUploadPhaseから受け取る開始時刻
  
  // 思考発話関連のstate
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isProcessing, setIsProcessing] = useState(false) // 思考発話処理中フラグ (WebSocket経由で制御想定)
  const [showComparison, setShowComparison] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const [correctionPhaseApiError, setCorrectionPhaseApiError] = useState<string | null>(null) // APIエラー (display-textなど)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [hasModification, setHasModification] = useState(false) // AIによる修正が行われたか
  
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null) // ★表示する商品情報
  
  const audioRecorderRef = useRef<RealtimeAudioRecorder | null>(null)
  const [history, setHistory] = useState<Array<{ utterance: string; edit_plan: string; modified_text: string }>>([])
  const suggestionTextareaRef = useRef<HTMLTextAreaElement>(null)
  // ThinkAloudでは商品説明文表示はTextareaではなくdivなので、refの型を調整するか、別のrefを使う
  const descriptionDisplayRef = useRef<HTMLDivElement>(null)


  // ユーザー認証チェック と 商品割り当て
  useEffect(() => {
    const storedUserId = localStorage.getItem("userId")
    if (!storedUserId) {
      router.push("/login")
    } else {
      setUserId(storedUserId)
      const product = getProductForExperiment(storedUserId, ExperimentPageType.ThinkAloud)
      setCurrentProduct(product)
    }
  }, [router])

  // AudioRecorderの初期化
  useEffect(() => {
    // audioRecorderRef.current の初期化とイベントリスナー設定はここに記述
    // (既存のコードをベースに、必要なら修正)
    audioRecorderRef.current = new RealtimeAudioRecorder();

    audioRecorderRef.current.onMessage((data) => {
      const receivedTime = new Date().toISOString();
      console.log(`[${receivedTime}] Received message from backend:`, data.type, data);
      if (data.type === 'edit_plan' || data.type === 'no_edit_needed') {
        // Promise.resolve().then(() => { // バッチ処理は不要な場合が多い
          setSuggestion(data.edit_plan);
          setTranscript(data.utterance);
          // originalTextForCorrection は display-text API のレスポンスでセットされる
          if (!originalTextForCorrection && data.original_text) {
            // このケースは通常発生しない想定 (display-text で originalText は確定しているため)
            // setOriginalTextForCorrection(data.original_text);
          }
          if (data.history_summary) {
            console.log(`[${receivedTime}] Current constraints:`, data.history_summary);
          }
        // });
      } else if (data.type === 'modification_complete') {
        // Promise.resolve().then(() => {
          setTextForCorrection(data.modified_text); // 修正後のテキストをセット
          setTranscript(data.utterance);
          setHistory(data.history);
          if (data.history_summary) {
            console.log(`[${receivedTime}] Updated constraints:`, data.history_summary);
          }
          setHasModification(true); // 修正があったことを記録
        // });
      } else {
        console.log(`[${receivedTime}] Received unexpected message type:`, data.type);
      }
    });

    audioRecorderRef.current.onError((error) => {
      console.error("WebSocket error:", error);
      const errorMessage = `WebSocket接続エラー: ${error instanceof Error ? error.message : String(error)}`;
      setRecordingError(errorMessage);
      if (isRecording) stopRecording(); // エラー時は録音停止
      toast({
        title: "WebSocketエラー",
        description: "バックエンドとの接続に失敗しました。",
        variant: "destructive",
      });
    });

    return () => {
      if (audioRecorderRef.current?.isActive()) {
        audioRecorderRef.current.stop();
      }
    };
  }, [originalTextForCorrection]); // originalTextForCorrectionに依存するかは要検討 (startRecordingのタイミング次第)

  // テキストエリアの高さ自動調整 (修正提案、商品説明表示エリア)
  const adjustDynamicTextareaHeights = () => {
    if (suggestionTextareaRef.current) {
      suggestionTextareaRef.current.style.height = 'auto';
      suggestionTextareaRef.current.style.height = `${suggestionTextareaRef.current.scrollHeight}px`;
    }
    // 商品説明文はdivなので、高さ自動調整は通常不要だが、内容によって親の高さが変わることはある
  }
  useEffect(() => {
    if (mode === "correction") {
      setTimeout(adjustDynamicTextareaHeights, 0);
    }
  }, [textForCorrection, suggestion, mode]);

  // ProductImageUploadPhase から呼び出されるコールバック関数
  const handleSetupForCorrectionPhase = async (generatedText: string, uploadedImagePreview: string | null, startTime: string) => {
    setImagePreviewForCorrection(uploadedImagePreview)
    setTaskStartTime(startTime) // ★開始時刻をstateに保存
    localStorage.setItem('taskStartTime', startTime) // localStorageにも保存
    console.log("ThinkAloud - Correction Start Time:", startTime)

    try {
      if (!userId || !currentProduct) {
        throw new Error("ユーザーIDまたは商品情報が見つかりません。")
      }

      // テキストをバックエンドに送信 (display-text API)
      setIsProcessing(true); // API呼び出し開始
      setCorrectionPhaseApiError(null);
      const response = await fetch("http://localhost:8000/api/display-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: generatedText, user_id: userId }),
      })
      setIsProcessing(false); // API呼び出し終了

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "サーバーエラーが発生しました。 (display-text)")
      }

      const data = await response.json()
      setOriginalTextForCorrection(data.text) // ★APIからのレスポンスをオリジナルテキストとして保存
      setTextForCorrection(data.text)       // ★表示用テキストもAPIからのレスポンスで初期化
      setHasModification(false); // この時点ではまだAIによる修正はない

      setMode("correction")
      await startRecording() // ★モード変更後に録音開始
    } catch (error) {
      setIsProcessing(false);
      console.error("Error setting up correction phase:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setCorrectionPhaseApiError(errorMessage) // ★APIエラーをstateに保存
      toast({
        title: "処理エラー",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleComplete = () => {
    if (isRecording) { // 完了時は録音を停止
        stopRecording();
    }
    const endTime = new Date().toISOString()
    const startTimeFromStorage = localStorage.getItem('taskStartTime')

    if (startTimeFromStorage) {
      localStorage.setItem('taskEndTime', endTime)
      console.log("end time: " + endTime)
      const durationMs = new Date(endTime).getTime() - new Date(startTimeFromStorage).getTime()
      const durationSeconds = Math.floor(durationMs / 1000)
      localStorage.setItem('taskDuration', durationSeconds.toString())
    } else {
      console.warn("Task start time not found in localStorage for duration calculation.")
    }
    router.push("/complete")
  }

  const startRecording = async () => {
    try {
      setRecordingError(null)
      // setCorrectionPhaseApiError(null); // 録音開始時にAPIエラーをクリアするかは状況による

      if (audioRecorderRef.current && userId) {
        // originalTextForCorrection が必要なら、それがセットされるのを待つか、
        // audioRecorderRef.current.start の引数で渡す
        await audioRecorderRef.current.start(userId /*, originalTextForCorrection */);
        setIsRecording(true)
        console.log("WebSocket connection initiated")
      } else {
        throw new Error("Audio recorder or User ID not available.")
      }
    } catch (error) {
      console.error("Failed to start WebSocket connection:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setRecordingError(errorMessage)
      toast({
        title: "録音開始エラー",
        description: errorMessage,
        variant: "destructive",
      })
      setIsRecording(false)
    }
  }

  const stopRecording = async () => {
    try {
      if (!audioRecorderRef.current?.isActive()) {
        console.log("Recording is not active, no need to stop.");
        setIsRecording(false); // 状態を確実にfalseにする
        return;
      }
      if (audioRecorderRef.current) {
        await audioRecorderRef.current.stop()
        setIsRecording(false)
        console.log("WebSocket connection stopped")
      }
    } catch (error) {
      console.error("Error stopping recording:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      // toastは重複を避けるため、エラーハンドリングは慎重に
      // setRecordingError(errorMessage); // 必要に応じて
    }
  }

  const getPreviousText = () => {
    if (history.length > 0) {
      // 最後の履歴の modified_text が現在の textForCorrection と同じはずなので、
      // その一つ前、つまり history[history.length - 1].original_text (もしあれば) または
      // history.length >= 2 なら history[history.length - 2].modified_text
      // ここでは、一番最初の originalTextForCorrection か、履歴の直前の modified_text を返す
      if (history.length === 1 && originalTextForCorrection) return originalTextForCorrection;
      if (history.length >= 2) return history[history.length - 2].modified_text;
      return originalTextForCorrection; // 履歴が1つで、その前がない場合は最初のoriginalText
    }
    return originalTextForCorrection; // 履歴がない場合は最初のoriginalText
  }

  if (!userId || !currentProduct) {
    return <div className="container mx-auto py-8 px-4 text-center">ユーザー情報または商品情報を読み込み中です...</div>;
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <Card className="max-w-3xl mx-auto">
        {mode === "upload" ? (
          <ProductImageUploadPhase
            userId={userId}
            onEditStart={handleSetupForCorrectionPhase}
            initialData={currentProduct}
            headerText={currentProduct ? `「${currentProduct.name}」の説明文をAIが生成します` : "商品説明文のAI生成"}
          />
        ) : (
          // Correction Mode
          <>
            <CardHeader>
              <div className="text-sm font-semibold text-gray-800">
                {currentProduct ? `「${currentProduct.name}」の` : ""}商品説明文を思考発話で修正します。
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {imagePreviewForCorrection && (
                  <div className="text-center mb-4">
                    <img
                      src={imagePreviewForCorrection}
                      alt={currentProduct?.name || "商品画像"}
                      className="max-w-[200px] max-h-[150px] mx-auto rounded-lg object-contain"
                    />
                  </div>
                )}

                {/* 録音制御ボタン (必要に応じてここに配置) */}
                {/*
                <div className="flex justify-center space-x-2">
                  <Button onClick={startRecording} disabled={isRecording || !originalTextForCorrection}>録音開始</Button>
                  <Button onClick={stopRecording} disabled={!isRecording}>録音停止</Button>
                </div>
                */}

                <div className="flex flex-col space-y-2">
                  {recordingError && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{recordingError}</AlertDescription>
                    </Alert>
                  )}

                  <p className="text-sm font-medium mb-1">あなたの発話：</p>
                  <div className="bg-muted p-3 rounded-md text-sm min-h-[3em]">
                    <p className="whitespace-pre-wrap break-words">{transcript || "ここに発話内容が表示されます..."}</p>
                  </div>

                  {correctionPhaseApiError && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{correctionPhaseApiError}</AlertDescription>
                    </Alert>
                  )}

                  {isProcessing && ( // display-text API呼び出し中のローダー
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>初期テキストを処理中...</span>
                    </div>
                  )}

                  <p className="text-sm font-medium mb-1">AIによる修正提案：</p>
                  <Textarea
                    ref={suggestionTextareaRef}
                    value={suggestion || ""}
                    readOnly
                    placeholder="ここにAIの修正計画や提案が表示されます..."
                    className="bg-blue-50 text-blue-800 border-blue-200 min-h-[3em]"
                  />
                </div>

                <div className="relative">
                  <p className="text-sm font-medium mb-1">商品説明文：</p>
                  <div 
                    ref={descriptionDisplayRef}
                    className="border rounded-md p-3 min-h-[7.5em] bg-white whitespace-pre-line break-words" // ★whitespace-pre-line を追加
                  >
                    {textForCorrection || <span className="text-muted-foreground">ここに商品説明が表示されます...</span>}
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
                        <> <ArrowUp className="h-4 w-4 mr-1" /> 非表示 </>
                      ) : (
                        <> <ArrowDown className="h-4 w-4 mr-1" /> 表示 </>
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
                            {textForCorrection || <span className="text-muted-foreground">現在のテキストはありません</span>}
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
                        // 修正がまだないか、録音中の場合は非活性
                        disabled={!hasModification || isRecording || isProcessing}
                      >
                        編集完了
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader className="flex items-center">
                        <AlertDialogTitle className="text-center">タスクを終了しますか？</AlertDialogTitle>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex justify-center gap-2 sm:justify-center">
                        <AlertDialogCancel className="mt-0" onClick={() => { if (mode === "correction" && !isRecording && originalTextForCorrection) startRecording()}}>キャンセル</AlertDialogCancel>
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
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </main>
  )
}