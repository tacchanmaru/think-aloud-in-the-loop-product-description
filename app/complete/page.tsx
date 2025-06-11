"use client"

import { Card, CardContent } from "@/components/ui/card"

export default function Complete() {
  return (
    <main className="container mx-auto py-8 px-4">
      <Card className="max-w-3xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
          <div className="text-xl font-medium">タスクを終了しました。</div>
          <div>実験者にお伝えください。</div>
        </CardContent>
      </Card>
    </main>
  )
} 