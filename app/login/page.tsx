"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function Login() {
  const router = useRouter()
  const [userId, setUserId] = useState<string>("")
  const [error, setError] = useState<string>("")

  const handleLogin = () => {
    const numValue = parseInt(userId)
    // 1-100の範囲内かチェック
    if (isNaN(numValue) || numValue < 1 || numValue > 100) {
      setError("ユーザーIDは1から100までの数字を入力してください")
      return
    }

    // ユーザーIDをローカルストレージに保存
    localStorage.setItem("userId", userId)
    // メインページにリダイレクト
    router.push("/")
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // 数字以外の入力を防ぐ
    if (value === "" || /^\d+$/.test(value)) {
      const numValue = parseInt(value)
      if (value === "" || (numValue >= 0 && numValue <= 100)) {
        setUserId(value)
        setError("")
      }
    }
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">実験用ログイン</CardTitle>
          <CardDescription className="text-center">
            ユーザーIDを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                ユーザーID
              </label>
              <Input
                type="number"
                min={1}
                max={100}
                value={userId}
                onChange={handleInputChange}
                placeholder=""
                className="text-center text-lg"
              />
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            <Button 
              onClick={handleLogin} 
              className="w-full"
              disabled={!userId || parseInt(userId) < 1 || parseInt(userId) > 100}
            >
              ログイン
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
} 