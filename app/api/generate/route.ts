import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(req: NextRequest) {
  try {
    const { originalText, feedback } = await req.json()

    if (!originalText || !feedback) {
      return NextResponse.json({ error: "Original text and feedback are required" }, { status: 400 })
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
      // まず修正提案を生成
      const { text: suggestion } = await generateText({
        model: openai("gpt-4o"),
        system: `
          あなたはメルカリの商品説明文を改善するAIアシスタントです。
          ユーザーが提供する元の商品説明文と、その改善に関するフィードバックに基づいて、
          どのような修正を行うべきかを自然言語で説明してください。
          
          明確な指示がある場合は、それに従い、そうで無い場合についても、議論の触発材になればいいので、修正の方向性を考えてみてください。
          修正そのものはこの時点では行わず、あくまで修正方針だけを出力してください。
        `,
        prompt: `
          【元の商品説明文】
          ${originalText}
          
          【ユーザーのフィードバック】
          ${feedback}
          
          上記のフィードバックに基づいて、どのような修正を行うべきか説明してください。
          出力形式：「〇〇な修正を加えてみるのはどうでしょうか？」
        `,
      })

      // 次に修正を適用
      const { text: result } = await generateText({
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

      return NextResponse.json({ result, suggestion })
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
