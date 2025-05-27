"use client"

import { useState, useRef, useEffect, ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AlertCircle } from "lucide-react" // 編集フェーズのエラー表示用に残す
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
import { getProductForExperiment, ExperimentPageType } from "@/lib/experimentUtils" // ★追加
import type { Product } from "@/lib/products" // ★追加

export default function BaselineManual() {
  const router = useRouter()
  const [mode, setMode] = useState<"upload" | "edit">("upload")
  const [userId, setUserId] = useState<string | null>(null)
  
  // 編集フェーズで使用するstate
  const [textForEdit, setTextForEdit] = useState("")
  const [originalTextForEdit, setOriginalTextForEdit] = useState("")
  const [imagePreviewForEdit, setImagePreviewForEdit] = useState<string | null>(null)
  const [hasEdited, setHasEdited] = useState(false)
  const [taskStartTime, setTaskStartTime] = useState<string | null>(null) // ProductImageUploadPhaseから受け取る開始時刻
  const [editPhaseApiError, setEditPhaseApiError] = useState<string | null>(null) // 編集フェーズ専用のエラー

  const [currentProduct, setCurrentProduct] = useState<Product | null>(null) // ★表示する商品情報
  const textareaRef = useRef<HTMLTextAreaElement>(null) // 編集フェーズのテキストエリア用

  // ユーザー認証チェック と 商品割り当て
  useEffect(() => {
    const storedUserId = localStorage.getItem("userId")
    if (!storedUserId) {
      router.push("/login")
    } else {
      setUserId(storedUserId)
      // ユーザーIDに基づいて表示する商品を取得
      const product = getProductForExperiment(storedUserId, ExperimentPageType.BaselineManual)
      setCurrentProduct(product)
    }
  }, [router])

  // テキストエリアの高さを自動調整する関数 (編集フェーズ用)
  const adjustTextareaHeight = () => {
    if (mode === "edit" && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  // テキストが変更されたときに高さを調整 (編集フェーズ用)
  useEffect(() => {
    if (mode === "edit") {
      setTimeout(adjustTextareaHeight, 0)
    }
  }, [textForEdit, mode])

  // ProductImageUploadPhase から呼び出されるコールバック関数
  const handleEditStartFromUpload = (generatedText: string, uploadedImagePreview: string | null, startTime: string) => {
    setTextForEdit(generatedText)
    setOriginalTextForEdit(generatedText)
    setImagePreviewForEdit(uploadedImagePreview)
    
    setTaskStartTime(startTime) // ★開始時刻をstateに保存
    localStorage.setItem('taskStartTime', startTime) // localStorageにも保存
    console.log("BaselineManual - Edit Start Time:", startTime)
    
    setMode("edit")
  }

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setTextForEdit(newText)
    setHasEdited(newText !== originalTextForEdit)
  }

  const handleComplete = () => {
    const endTime = new Date().toISOString()
    // taskStartTime は localStorage から読むか、state から読むか統一（ここではlocalStorage優先）
    const startTimeFromStorage = localStorage.getItem('taskStartTime') 

    if (startTimeFromStorage) {
      localStorage.setItem('taskEndTime', endTime)
      console.log("end time: " + endTime)
      const durationMs = new Date(endTime).getTime() - new Date(startTimeFromStorage).getTime()
      const durationSeconds = Math.floor(durationMs / 1000)
      localStorage.setItem('taskDuration', durationSeconds.toString())
    } else {
      console.warn("Task start time not found in localStorage.")
    }
    router.push("/complete")
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
            onEditStart={handleEditStartFromUpload}
            initialData={currentProduct} // ★商品データを渡す
          />
        ) : (
          // Edit Mode
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
                    className="min-h-[7.5em] resize-y whitespace-pre-line" // ★whitespace-pre-line を追加
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
                          onClick={handleComplete}
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
  )
}