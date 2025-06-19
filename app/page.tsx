"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

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
          
          <Separator className="my-4" />
          
          <div className="text-center text-sm font-medium text-gray-600 mb-2">
            練習用
          </div>
          <Button 
            className="w-full bg-orange-500 hover:bg-orange-600" 
            onClick={() => router.push("/baseline-manual?practice")}
          >
            手動編集（練習用）
          </Button>
          <Button 
            className="w-full bg-orange-500 hover:bg-orange-600" 
            onClick={() => router.push("/think-aloud?practice")}
          >
            思考発話（練習用）
          </Button>
          
          <Separator className="my-4" />
          
          <div className="text-center text-sm font-medium text-gray-600 mb-2">
            実験
          </div>
          <Button 
            className="w-full" 
            onClick={() => router.push("/baseline-manual")}
          >
            手動編集
          </Button>
          <Button 
            className="w-full" 
            onClick={() => router.push("/think-aloud")}
          >
            思考発話
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
