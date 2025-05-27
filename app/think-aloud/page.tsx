"use client"

import { useState, useRef, useEffect, ChangeEvent } from "react"
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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import ProductImageUploadPhase from "@/components/custom/ProductImageUploadPhase"
import { getProductForExperiment, ExperimentPageType } from "@/lib/experimentUtils"
import type { Product } from "@/lib/products"
import { saveExperimentTaskData } from "@/lib/experimentService"; // ★ インポート
import type { ThinkAloudExperimentResult } from "@/lib/types";   // ★ インポート

export default function ThinkAloud() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<"upload" | "correction">("upload");
  const [userId, setUserId] = useState<string | null>(null);

  const [textForCorrection, setTextForCorrection] = useState("");
  const [originalTextForCorrection, setOriginalTextForCorrection] = useState("");
  const [imagePreviewForCorrection, setImagePreviewForCorrection] = useState<string | null>(null);
  const [taskStartTime, setTaskStartTime] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [correctionPhaseApiError, setCorrectionPhaseApiError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [hasModification, setHasModification] = useState(false);

  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

  const audioRecorderRef = useRef<RealtimeAudioRecorder | null>(null);
  const [history, setHistory] = useState<Array<{ utterance: string; edit_plan: string; modified_text: string }>>([]);
  const suggestionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const descriptionDisplayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (!storedUserId) {
      router.push("/login");
    } else {
      setUserId(storedUserId);
      const product = getProductForExperiment(storedUserId, ExperimentPageType.ThinkAloud);
      setCurrentProduct(product);
    }
  }, [router]);

  useEffect(() => {
    audioRecorderRef.current = new RealtimeAudioRecorder();
    audioRecorderRef.current.onMessage((data) => {
      const receivedTime = new Date().toISOString();
      console.log(`[${receivedTime}] Received message from backend:`, data.type, data);
      if (data.type === 'edit_plan' || data.type === 'no_edit_needed') {
        setSuggestion(data.edit_plan);
        setTranscript(data.utterance);
        if (data.history_summary) {
          console.log(`[${receivedTime}] Current constraints:`, data.history_summary);
        }
      } else if (data.type === 'modification_complete') {
        setTextForCorrection(data.modified_text);
        setTranscript(data.utterance);
        setHistory(data.history);
        if (data.history_summary) {
          console.log(`[${receivedTime}] Updated constraints:`, data.history_summary);
        }
        setHasModification(true);
      } else {
        console.log(`[${receivedTime}] Received unexpected message type:`, data.type);
      }
    });
    audioRecorderRef.current.onError((error) => {
      console.error("WebSocket error:", error);
      const errorMessage = `WebSocket接続エラー: ${error instanceof Error ? error.message : String(error)}`;
      setRecordingError(errorMessage);
      if (isRecording) stopRecordingInternal(); // エラー時は録音停止
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初期化は一度だけを想定

  const adjustDynamicTextareaHeights = () => {
    if (suggestionTextareaRef.current) {
      suggestionTextareaRef.current.style.height = 'auto';
      suggestionTextareaRef.current.style.height = `${suggestionTextareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (mode === "correction") {
      setTimeout(adjustDynamicTextareaHeights, 0);
    }
  }, [textForCorrection, suggestion, mode]);

  const handleSetupForCorrectionPhase = async (generatedText: string, uploadedImagePreview: string | null, startTime: string) => {
    setImagePreviewForCorrection(uploadedImagePreview);
    setTaskStartTime(startTime);
    localStorage.setItem('taskStartTime', startTime);
    console.log("ThinkAloud - Correction Start Time:", startTime);

    try {
      if (!userId || !currentProduct) {
        throw new Error("ユーザーIDまたは商品情報が見つかりません。");
      }
      setIsProcessing(true);
      setCorrectionPhaseApiError(null);
      const response = await fetch("http://localhost:8000/api/display-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: generatedText, user_id: userId }),
      });
      setIsProcessing(false);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "サーバーエラーが発生しました。 (display-text)");
      }
      const data = await response.json();
      setOriginalTextForCorrection(data.text);
      setTextForCorrection(data.text);
      setHasModification(false);
      setMode("correction");
      await startRecordingInternal();
    } catch (error) {
      setIsProcessing(false);
      console.error("Error setting up correction phase:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setCorrectionPhaseApiError(errorMessage);
      toast({
        title: "処理エラー",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // stopRecording が2箇所で使われるため、内部関数として定義
  const stopRecordingInternal = async () => {
    try {
      if (audioRecorderRef.current?.isActive()) {
        await audioRecorderRef.current.stop();
        console.log("WebSocket connection stopped");
      } else {
        console.log("Recording is not active, no need to stop.");
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
      // toastはonErrorで出すのでここでは控えるか、状況に応じて
    } finally {
        setIsRecording(false); // 状態を確実にfalseにする
    }
  };


  const handleComplete = async () => { // ★ async に変更
    if (isRecording) {
      await stopRecordingInternal(); // ★ 修正: 内部関数を呼び出し
    }
    const endTime = new Date().toISOString();
    const startTimeFromStorage = localStorage.getItem('taskStartTime');

    if (!userId || !currentProduct || !startTimeFromStorage) {
      toast({
        title: "エラー",
        description: "完了処理に必要な情報が不足しています。タスクデータは保存されません。",
        variant: "destructive",
      });
      router.push("/complete"); // データ不足でも完了ページへ
      return;
    }

    const durationMs = new Date(endTime).getTime() - new Date(startTimeFromStorage).getTime();
    const durationSeconds = Math.floor(durationMs / 1000);

    localStorage.setItem('taskEndTime', endTime);
    localStorage.setItem('taskDuration', durationSeconds.toString());

    const experimentData: ThinkAloudExperimentResult = {
      userId,
      experimentType: "think-aloud",
      productId: currentProduct.id,
      originalText: originalTextForCorrection,
      finalText: textForCorrection,
      startTime: startTimeFromStorage,
      endTime,
      durationSeconds,
      intermediateSteps: history,
    };

    // ★ 共通サービスを呼び出してデータを保存
    const result = await saveExperimentTaskData(experimentData);

    if (result.success) {
      toast({
        title: "成功",
        description: "実験データが保存されました。",
      });
    } else {
      toast({
        title: "保存エラー",
        description: result.message || "データの保存に失敗しました。",
        variant: "destructive",
      });
    }
    router.push("/complete"); // 保存の成否に関わらず完了ページへ遷移
  };

  const startRecordingInternal = async () => { // ★ startRecordingから名前変更 (内部用)
    try {
      setRecordingError(null);
      if (audioRecorderRef.current && userId) {
        await audioRecorderRef.current.start(userId);
        setIsRecording(true);
        console.log("WebSocket connection initiated");
      } else {
        throw new Error("Audio recorder or User ID not available.");
      }
    } catch (error) {
      console.error("Failed to start WebSocket connection:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setRecordingError(errorMessage);
      toast({
        title: "録音開始エラー",
        description: errorMessage,
        variant: "destructive",
      });
      setIsRecording(false);
    }
  };


  const getPreviousText = () => {
    if (history.length > 0) {
      if (history.length === 1 && originalTextForCorrection) return originalTextForCorrection;
      if (history.length >= 2) return history[history.length - 2].modified_text;
      return originalTextForCorrection;
    }
    return originalTextForCorrection;
  };

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
          />
        ) : (
          <>
            <CardHeader>
              <div className="text-sm font-semibold text-gray-800">
                商品画像をアップロードすると、AIが商品説明文を生成します。<br />
                生成された商品説明文をよく読んでから、編集を開始してください。
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
                  {isProcessing && (
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
                    className="border rounded-md p-3 min-h-[7.5em] bg-white whitespace-pre-line break-words"
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
                        <AlertDialogCancel className="mt-0" onClick={() => { if (mode === "correction" && !isRecording && originalTextForCorrection) startRecordingInternal()}}>キャンセル</AlertDialogCancel>
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
  );
}