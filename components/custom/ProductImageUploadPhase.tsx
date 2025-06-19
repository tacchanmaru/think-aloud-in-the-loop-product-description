"use client"

import { useState, useRef, useEffect, ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CardHeader, CardContent } from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ProductImageUploadPhaseProps {
  userId: string;
  onEditStart: (text: string, imagePreviewUrl: string | null, startTime: string) => void; // startTime を追加
  apiEndpointGenerateDescription?: string;
  initialData?: { // 初期データ表示モード用のオプション
    text: string;
    imagePreviewUrl: string | null;
  };
  isPracticeMode?: boolean;
}

export default function ProductImageUploadPhase({
  userId,
  onEditStart,
  apiEndpointGenerateDescription = 'http://localhost:8000/api/generate-description',
  initialData,
  isPracticeMode = false
}: ProductImageUploadPhaseProps) {
  const { toast } = useToast();
  const isInitialDataMode = !!initialData; // initialData が提供されていればtrue

  const [text, setText] = useState(initialData?.text ?? ""); // initialData があればそのテキスト、なければ空文字
  const [isUploading, setIsUploading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState(initialData?.imagePreviewUrl ?? null); // initialData があればその画像、なければnull
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // テキストエリアの高さを自動調整する関数
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // テキストが変更されたとき（主にinitialDataやAPIからのセット時）に高さを調整
  useEffect(() => {
    setTimeout(adjustTextareaHeight, 0);
  }, [text]);

  // initialData が変更された場合（通常はマウント時のみだが念のため）にstateを更新
  useEffect(() => {
    if (isInitialDataMode) {
      setText(initialData.text);
      setImagePreview(initialData.imagePreviewUrl);
      setApiError(null); // 初期データモードではAPIエラーはリセット
    }
    // isInitialDataModeがfalseの場合、親がkeyを変えるなどで再マウントさせない限り、
    // 通常のアップロードフローでこのuseEffectが初期化の邪魔をしないように注意。
    // このコンポーネントが同じインスタンスのまま initialData の有無が切り替わることは稀と想定。
  }, [initialData, isInitialDataMode]);


  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (isInitialDataMode) return; // 初期データモードではアップロード処理をしない

    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    setApiError(null);
    setText("");

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', userId);

      const response = await fetch(apiEndpointGenerateDescription, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (result.success) {
        setText(result.description);
      } else {
        const errorMessage = `説明文の生成に失敗しました: ${result.error || '不明なエラー'}`;
        setApiError(errorMessage);
        toast({
          title: "エラー",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`;
      setApiError(errorMessage);
      toast({
        title: "エラー",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartEditClick = () => {
    // テキストが空でなく、アップロード中でもない場合に実行
    if (text && !isUploading) {
      const startTime = new Date().toISOString(); // ★「編集に進む」ボタンを押した時刻
      onEditStart(text, imagePreview, startTime); // ★ startTime をコールバックで渡す
    }
  };

  return (
    <>
      <CardHeader>
      <div className="text-sm font-semibold text-gray-800">
        {isInitialDataMode ?
          "画面上の商品説明文をよく読んでから、編集を開始してください。" : (
          <>
            商品画像をアップロードすると、AIが商品説明文を生成します。<br />
            生成された商品説明文をよく読んでから、編集を開始してください。
          </>
        )}
        {isPracticeMode && (
          <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
            🧪 練習モード
          </div>
        )}
      </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!isInitialDataMode ? (
            // 通常の画像アップロードUI
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
          ) : imagePreview ? (
            // 初期データモードで画像がある場合の表示
            <div className="text-center">
              <img
                src={imagePreview}
                alt="商品画像"
                className="max-w-[200px] max-h-[150px] mx-auto rounded-lg object-contain"
              />
            </div>
          ) : null /* 初期データモードで画像がない場合は何も表示しない */}

          <div className="space-y-2">
            <p className="text-sm font-medium">商品説明文：</p>
            <Textarea
              ref={textareaRef}
              placeholder={isInitialDataMode && !text ? "商品説明文がありません。" : "ここに商品説明が表示されます..."}
              className="min-h-[7.5em] overflow-hidden"
              value={text}
              readOnly // このコンポーネントでは常に読み取り専用
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleStartEditClick}
              variant={text ? "default" : "secondary"}
              className={text
                ? "bg-blue-600 hover:bg-blue-700 transition-colors"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"}
              disabled={!text || isUploading} // テキストがない、またはアップロード中は非活性
            >
              編集に進む
            </Button>
          </div>

          {apiError && ( // APIエラーは通常モードでのみ表示される想定
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </>
  );
}