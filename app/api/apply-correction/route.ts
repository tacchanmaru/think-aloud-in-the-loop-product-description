import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(req: NextRequest) {
  try {
    const { originalText, suggestion, feedback } = await req.json()

    if (!originalText || !suggestion) {
      return NextResponse.json({ error: "Original text and suggestion are required" }, { status: 400 })
    }

    // APIキーが設定されているか確認
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set")
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable." },
        { status: 500 },
      )
    }

    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        system: `
          あなたはメルカリの商品説明文を改善するAIアシスタントです。
          ユーザーが提供する元の商品説明文と、修正方針に基づいて、
          商品説明文を修正してください。
          
          修正の際には以下のガイドラインに従ってください：
          1. 修正方針を忠実に反映する
          2. 商品の魅力が伝わる表現を心がける
          3. 簡潔かつ明確な文章を作成する
          4. メルカリの商品説明として適切な丁寧さを保つ
          
          修正した文章のみを返してください。説明や理由は含めないでください。
        `,
        prompt: `
          【元の商品説明文】
          ${originalText}
          
          【修正方針】
          ${suggestion}
          
          【ユーザーのフィードバック】
          ${feedback}
          
          上記の修正方針に基づいて商品説明文を修正してください。
          修正した文章のみを出力してください。
        `,
      })

      return NextResponse.json({ result: text })
    } catch (error: any) {
      console.error("OpenAI API error:", error)
      return NextResponse.json(
        { error: `Error calling OpenAI API: ${error.message || "Unknown error"}` },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Request processing error:", error)
    return NextResponse.json(
      { error: `Failed to process request: ${error.message || "Unknown error"}` },
      { status: 500 },
    )
  }
}
