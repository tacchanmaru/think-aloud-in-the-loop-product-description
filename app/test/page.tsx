"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function TestDiffDisplay() {
  const [originalText, setOriginalText] = useState("")
  const [currentText, setCurrentText] = useState("")
  const [previousText, setPreviousText] = useState("")
  const [showDiff, setShowDiff] = useState(true)

  const initialText = `ふわふわの白いイタチのぬいぐるみ。黒いしっぽとつぶらな瞳がかわいらしいデザインです。

- 種類: イタチのぬいぐるみ
- カラー: ホワイト（しっぽは黒）
- 特徴: ふわふわ素材、可愛い表情
- サイズ: 約20cm（目安）

ご覧いただきありがとうございます。`

  const firstUpdateText = `ふわふわで手触りの良い、白いイタチのぬいぐるみです。黒いしっぽとつぶらな瞳がかわいらしいデザインで、お部屋やデスクに飾るのにもおすすめです。

- 種類: イタチのぬいぐるみ
- カラー: ホワイト（しっぽは黒）
- 特徴: 柔らかなふわふわ素材、可愛い表情、癒やし系の見た目
- サイズ: 高さ約20cm（手作業にて採寸のため、多少の誤差があります）
- お手入れ: 洗剤を使わずに表面をやさしく拭き取ってお手入れください
- 状態: 目立つ傷や汚れなどなく、きれいなコンディションです（中古・自宅保管）
- 素材感: 毛足が短くなめらかで、肌ざわりもやさしいです

ご覧いただきありがとうございます。`

  const secondUpdateText = `ふんわりとなめらかな手触りが特徴の、白いイタチのぬいぐるみです。黒いしっぽとつぶらな瞳が愛らしく、インテリアやデスクの癒やしアイテムとしてもおすすめです

- 種類: イタチのぬいぐるみ
- カラー: ホワイト（しっぽは黒）
- 特徴: しっとりとしたやわらかな生地で、思わず撫でたくなる優しい手触り・愛らしい表情・癒やし系デザイン
- サイズ: 高さ約20cm（手作業にて採寸のため、多少の誤差があります）
- お手入れ: 汚れが気になる場合は、乾いた柔らかい布やブラシで軽くほこりを払い、落ちにくい部分は水で湿らせた布でやさしく表面を拭き取ってください。洗濯機の使用は避けてください
- 状態: 目立つ汚れや傷、毛羽立ちもなく、全体的に大変きれいなコンディションです（中古・自宅保管）
- 素材感: 毛足が短く、とてもなめらかで肌ざわりもやさしく、抱きしめたくなる質感です

ご覧いただきありがとうございます。`

  useEffect(() => {
    setOriginalText(initialText)
    setCurrentText(initialText)
    setPreviousText(initialText)

    const firstTimer = setTimeout(() => {
      setPreviousText(initialText)
      setCurrentText(firstUpdateText)
    }, 2000)

    const secondTimer = setTimeout(() => {
      setPreviousText(firstUpdateText)
      setCurrentText(secondUpdateText)
    }, 5000)

    return () => {
      clearTimeout(firstTimer)
      clearTimeout(secondTimer)
    }
  }, [])

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

  return (
    <main className="container mx-auto py-8 px-4">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">差分表示テスト</h1>
          <p className="text-center text-sm text-gray-600">
            2秒後に1回目の修正、5秒後に2回目の修正が表示されます
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
              <div className="border rounded-md p-3 min-h-[7.5em] bg-white">
                {currentText ? (
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
                      <div className="whitespace-pre-line break-words">
                        {previousText ? (
                          calculateLineDiff(previousText, currentText).map((line, index) => (
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
                          <div className="whitespace-pre-line break-words">{currentText}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-line break-words">{currentText}</div>
                  )
                ) : (
                  <span className="text-muted-foreground">ここに商品説明が表示されます...</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}