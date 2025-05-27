"use client"

import { useState, useRef, useEffect, ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
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
import ProductImageUploadPhase from "@/components/custom/ProductImageUploadPhase"
import { getProductForExperiment, ExperimentPageType } from "@/lib/experimentUtils"
import type { Product } from "@/lib/products"
import { saveExperimentTaskData } from "@/lib/experimentService"; // ★ インポート
import type { ManualExperimentResult } from "@/lib/types";      // ★ インポート
import { useToast } from "@/components/ui/use-toast";          // ★ トーストを使うならインポート

export default function BaselineManual() {
  const router = useRouter();
  const { toast } = useToast(); // ★ トーストを使うなら宣言
  const [mode, setMode] = useState<"upload" | "edit">("upload");
  const [userId, setUserId] = useState<string | null>(null);

  const [textForEdit, setTextForEdit] = useState("");
  const [originalTextForEdit, setOriginalTextForEdit] = useState("");
  const [imagePreviewForEdit, setImagePreviewForEdit] = useState<string | null>(null);
  const [hasEdited, setHasEdited] = useState(false);
  const [taskStartTime, setTaskStartTime] = useState<string | null>(null);
  const [editPhaseApiError, setEditPhaseApiError] = useState<string | null>(null);

  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (!storedUserId) {
      router.push("/login");
    } else {
      setUserId(storedUserId);
      const product = getProductForExperiment(storedUserId, ExperimentPageType.BaselineManual);
      setCurrentProduct(product);
    }
  }, [router]);

  const adjustTextareaHeight = () => {
    if (mode === "edit" && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (mode === "edit") {
      setTimeout(adjustTextareaHeight, 0);
    }
  }, [textForEdit, mode]);

  const handleEditStartFromUpload = (generatedText: string, uploadedImagePreview: string | null, startTime: string) => {
    setTextForEdit(generatedText);
    setOriginalTextForEdit(generatedText);
    setImagePreviewForEdit(uploadedImagePreview);
    setTaskStartTime(startTime);
    localStorage.setItem('taskStartTime', startTime);
    console.log("BaselineManual - Edit Start Time:", startTime);
    setMode("edit");
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setTextForEdit(newText);
    setHasEdited(newText !== originalTextForEdit);
  };

  const handleComplete = async () => { // ★ async に変更
    const endTime = new Date().toISOString();
    const startTimeFromStorage = localStorage.getItem('taskStartTime');

    if (!userId || !currentProduct || !startTimeFromStorage) {
      toast({ // ★ トースト通知を追加 (任意)
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

    const experimentData: ManualExperimentResult = {
      userId,
      experimentType: "manual",
      productId: currentProduct.id,
      originalText: originalTextForEdit,
      finalText: textForEdit,
      startTime: startTimeFromStorage,
      endTime,
      durationSeconds,
    };

    // ★ 共通サービスを呼び出してデータを保存
    const result = await saveExperimentTaskData(experimentData);

    if (result.success) {
      toast({ // ★ トースト通知を追加 (任意)
        title: "成功",
        description: "実験データが保存されました。",
      });
    } else {
      toast({ // ★ トースト通知を追加 (任意)
        title: "保存エラー",
        description: result.message || "データの保存に失敗しました。",
        variant: "destructive",
      });
    }
    router.push("/complete"); // 保存の成否に関わらず完了ページへ遷移
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
            onEditStart={handleEditStartFromUpload}
            initialData={currentProduct}
          />
        ) : (
          <>
            <CardHeader>
              <div className="text-sm font-semibold text-gray-800">
                「出品していい」と思う状態まで、商品説明文を編集してください。<br/>
                編集が完了したら、編集完了ボタンを押してください。
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {imagePreviewForEdit && (
                  <div className="text-center mb-4">
                    <img
                      src={imagePreviewForEdit}
                      alt={currentProduct?.name || "商品画像"}
                      className="max-w-[200px] max-h-[150px] mx-auto rounded-lg object-contain"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-sm font-medium">商品説明文：</p>
                  <Textarea
                    ref={textareaRef}
                    placeholder="ここに商品説明が表示されます..."
                    className="min-h-[7.5em] resize-y whitespace-pre-line"
                    value={textForEdit}
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
                          onClick={handleComplete} // ★ 修正された handleComplete を呼ぶ
                          className="bg-blue-600 hover:bg-blue-700 mt-0"
                        >
                          完了する
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                {editPhaseApiError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{editPhaseApiError}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </main>
  );
}