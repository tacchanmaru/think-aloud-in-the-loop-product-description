"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function Home() {
  const router = useRouter()

  return (
    <main className="container mx-auto py-8 px-4">
      <Card className="max-w-md mx-auto">
        <CardContent className="space-y-4 pt-6">
          <Button 
            className="w-full" 
            onClick={() => router.push("/login")}
          >
            ログイン
          </Button>
          <Button 
            className="w-full" 
            onClick={() => router.push("/baseline-manual")}
          >
            ベースライン実験（手動編集）
          </Button>
          <Button 
            className="w-full" 
            onClick={() => router.push("/think-aloud")}
          >
            思考発話実験
          </Button>
          <Button 
            className="w-full" 
            onClick={() => router.push("/think-aloud?practice")}
          >
            思考発話実験（練習用）
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
