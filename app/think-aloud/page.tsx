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
import { saveExperimentTaskData } from "@/lib/experimentService"
import type { ThinkAloudExperimentResult } from "@/lib/types"
import { usePracticeMode } from "@/hooks/useTestMode"

export default function ThinkAloud() {
  const router = useRouter();
  const { toast } = useToast();
  const isPracticeMode = usePracticeMode();
  const [mode, setMode] = useState<"upload" | "correction">("upload");
  const [userId, setUserId] = useState<string | null>(null);

  // Practice mode data
  const practiceData = {
    text: `ユニークなガチョウのぬいぐるみ、大きめサイズで存在感があります。

- 動物モチーフ: ガチョウ
- カラー: ホワイト×オレンジ
- 素材: ふわふわの生地
- サイズ: 大きめ（約全長80cm）
- 特徴: インテリアや抱き枕にもおすすめ

ご覧いただきありがとうございます。`,
    imagePreviewUrl: "/images/goose.jpeg"
  };

  const [textForCorrection, setTextForCorrection] = useState("");
  const [originalTextForCorrection, setOriginalTextForCorrection] = useState("");
  const [imagePreviewForCorrection, setImagePreviewForCorrection] = useState<string | null>(null);
  const [taskStartTime, setTaskStartTime] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDiff, setShowDiff] = useState(true);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [correctionPhaseApiError, setCorrectionPhaseApiError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [hasModification, setHasModification] = useState(false);
  const [processingUtterance, setProcessingUtterance] = useState<string | null>(null);
  const [recognizedUtterances, setRecognizedUtterances] = useState<string[]>([]);
  const [showEditingReflection, setShowEditingReflection] = useState(false);

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
      if (data.type === 'edit_plan') {
        setSuggestion(data.edit_plan);
        setTranscript(data.utterance);
        setShowEditingReflection(true); // Show editing status
        // Keep processingUtterance to display below the editing message
        if (data.history_summary) {
          console.log(`[${receivedTime}] Current constraints:`, data.history_summary);
        }
      } else if (data.type === 'no_edit_needed') {
        const utterance = data.utterance || "";
        setSuggestion(`あなたの発話「${utterance}」に対する修正は行いません。`);
        setTranscript(utterance);
        setProcessingUtterance(null); // Clear processing utterance
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
        setShowEditingReflection(false); // Hide "編集反映中"
        setProcessingUtterance(null); // Clear processing utterance
      } else if (data.type === 'processing_started') {
        console.log(`[${receivedTime}] Processing started for utterance:`, data.utterance);
        setProcessingUtterance(data.utterance);
        // Remove utterances that match the processing utterance from the beginning
        setRecognizedUtterances(prev => {
          const combinedText = prev.join("");
          if (combinedText.startsWith(data.utterance)) {
            const remainingText = combinedText.slice(data.utterance.length);
            return remainingText ? [remainingText] : [];
          }
          return prev;
        });
      } else if (data.type === 'transcription_completed') {
        console.log(`[${receivedTime}] Transcription completed:`, data.utterance);
        // Add to recognized utterances
        setRecognizedUtterances(prev => [...prev, data.utterance])
      } else {
        console.log(`[${receivedTime}] Received unexpected message type:`, data.type);
      }
    });
    audioRecorderRef.current.onError((error) => {
      console.error("WebSocket error:", error);
      const errorMessage = `WebSocket接続エラー: ${error instanceof Error ? error.message : String(error)}`;
      setRecordingError(errorMessage);
      if (isRecording) stopRecordingInternal();
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
  }, [isPracticeMode]);

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
    console.log("1. handleSetupForCorrectionPhase received generatedText:", generatedText);

    setMode("correction");
    setIsProcessing(true);
    setCorrectionPhaseApiError(null);

    try {
      if (!userId || !currentProduct) {
        throw new Error("ユーザーIDまたは商品情報が見つかりません。");
      }
      const response = await fetch("http://localhost:8000/api/display-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: generatedText, user_id: userId }),
      });

      console.log("2. /api/display-text response status:", response.status);

      setIsProcessing(false);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "サーバーエラーが発生しました。 (display-text)");
      }
      const data = await response.json();
      
      setOriginalTextForCorrection(generatedText);
      setTextForCorrection(generatedText);
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
    } finally {
        setIsRecording(false);
    }
  };

  const handleComplete = async () => {
    if (isRecording) {
      await stopRecordingInternal();
    }
    const endTime = new Date().toISOString();
    const startTimeFromStorage = localStorage.getItem('taskStartTime');

    if (!userId || !currentProduct || !startTimeFromStorage) {
      toast({
        title: "エラー",
        description: "完了処理に必要な情報が不足しています。タスクデータは保存されません。",
        variant: "destructive",
      });
      router.push("/complete");
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
      isPracticeMode,
    };

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
    router.push("/complete");
  };

  const startRecordingInternal = async () => {
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

  const calculateLineDiff = (originalText: string, currentText: string) => {
    const originalLines = originalText.split('\n');
    const currentLines = currentText.split('\n');
    
    // LCS（最長共通部分列）を使用した差分計算
    const lcs = calculateLCS(originalLines, currentLines);
    const result: Array<{ content: string; type: 'unchanged' | 'added' | 'removed' }> = [];
    
    let i = 0, j = 0, k = 0;
    
    while (i < originalLines.length || j < currentLines.length) {
      if (k < lcs.length && i < originalLines.length && j < currentLines.length && 
          originalLines[i] === lcs[k] && currentLines[j] === lcs[k]) {
        // 共通の行
        result.push({ content: currentLines[j], type: 'unchanged' });
        i++;
        j++;
        k++;
      } else if (i < originalLines.length && (k >= lcs.length || originalLines[i] !== lcs[k])) {
        // 削除された行
        result.push({ content: originalLines[i], type: 'removed' });
        i++;
      } else if (j < currentLines.length && (k >= lcs.length || currentLines[j] !== lcs[k])) {
        // 追加された行
        result.push({ content: currentLines[j], type: 'added' });
        j++;
      }
    }
    
    return result;
  };

  const calculateLCS = (arr1: string[], arr2: string[]): string[] => {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    // DPテーブルを構築
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    // LCSを復元
    const lcs: string[] = [];
    let i = m, j = n;
    
    while (i > 0 && j > 0) {
      if (arr1[i - 1] === arr2[j - 1]) {
        lcs.unshift(arr1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    
    return lcs;
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
            initialData={isPracticeMode ? practiceData : currentProduct}
          />
        ) : (
          <>
            <CardHeader>
              <div className="text-sm font-semibold text-gray-800">
                商品画像をアップロードすると、AIが商品説明文を生成します。<br />
                生成された商品説明文をよく読んでから、編集を開始してください。
                {isPracticeMode && (
                  <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                    🧪 練習モード
                  </div>
                )}
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
                  {/* <p className="text-sm font-medium mb-1">AIによる修正提案：</p>
                  <Textarea
                    ref={suggestionTextareaRef}
                    value={suggestion || ""}
                    readOnly
                    placeholder="ここにAIの修正計画や提案が表示されます..."
                    className="bg-blue-50 text-blue-800 border-blue-200 min-h-[3em] text-base resize-none overflow-hidden"
                  /> */}
                </div>
                <div className="relative">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-medium">商品説明文：</p>
                    <div className="flex bg-gray-300 rounded-full p-1">
                      <button
                        onClick={() => setShowDiff(true)}
                        className={`px-4 py-2 text-xs font-medium rounded-full transition-colors ${
                          showDiff
                            ? 'bg-green-500 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        差分表示
                      </button>
                      <button
                        onClick={() => setShowDiff(false)}
                        className={`px-4 py-2 text-xs font-medium rounded-full transition-colors ${
                          !showDiff
                            ? 'bg-green-500 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        現在の文章のみ
                      </button>
                    </div>
                  </div>
                  <div
                    ref={descriptionDisplayRef}
                    className="border rounded-md p-3 min-h-[7.5em] bg-white"
                  >
                    {textForCorrection ? (
                      showDiff ? (
                        <div>
                          <div className="mb-2 flex gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-green-100 border rounded"></div>
                              <span>追加された行</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-red-100 border rounded"></div>
                              <span>削除された行</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-white border rounded"></div>
                              <span>変更なし</span>
                            </div>
                          </div>
                          <div className="whitespace-pre-line break-words text-base">
                            {getPreviousText() ? (
                              calculateLineDiff(getPreviousText() || '', textForCorrection).map((line, index) => (
                                <div
                                  key={index}
                                  className={`${
                                    line.type === 'added'
                                      ? 'bg-green-100'
                                      : line.type === 'removed'
                                      ? 'bg-red-100'
                                      : 'bg-white'
                                  } ${line.content.trim() === '' ? 'min-h-[1em]' : ''}`}
                                >
                                  {line.content || '\u00A0'}
                                </div>
                              ))
                            ) : (
                              <div className="whitespace-pre-line break-words text-base">{textForCorrection}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-line break-words text-base">{textForCorrection}</div>
                      )
                    ) : (
                      <span className="text-muted-foreground">ここに商品説明が表示されます...</span>
                    )}
                  </div>
                </div>
                
                {/* Status Display Sections */}
                <div className="space-y-3">
                  {/* Processing Utterance */}
                  <div>
                    <p className="text-sm font-medium mb-1">処理中の発話：</p>
                    <div className="border rounded-md p-3 min-h-[2.5em] bg-yellow-50 border-yellow-200">
                      {showEditingReflection ? (
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-600" />
                            <span className="text-blue-800 text-base font-bold">商品説明文を編集します</span>
                          </div>
                          {processingUtterance && (
                            <div className="text-yellow-800 text-sm pl-6">
                              {processingUtterance}
                            </div>
                          )}
                        </div>
                      ) : processingUtterance ? (
                        <div className="flex items-center">
                          <span className="text-yellow-800 text-sm">{processingUtterance}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">処理中の発話がここに表示されます...</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Recognized Utterances */}
                  <div>
                    <p className="text-sm font-medium mb-1">認識中の発話：</p>
                    <div className="border rounded-md p-3 min-h-[2.5em] bg-green-50 border-green-200">
                      {recognizedUtterances.length > 0 ? (
                        <span className="text-green-800 text-sm">{recognizedUtterances.join("")}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">認識された発話がここに表示されます...</span>
                      )}
                    </div>
                  </div>
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