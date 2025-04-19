import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(req: NextRequest) {
  try {
    const { transcription, currentText } = await req.json()

    if (!transcription) {
      return NextResponse.json({ error: "Transcription is required" }, { status: 400 })
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
          あなたはユーザーの発話が、画面上のテキストに対する感想・フィードバックを含んでいるかを判定するAIアシスタントです。
          雑音や関係ない話（例: 咳払い・意味のない言葉・話題の逸脱）などは "No" としてください。
          ユーザーは、明確な改善を示すこともあれば、何らかの不満点などを示すこともあると思いますが、いずれにせよ、画面上のテキストに対するフィードバックを含んでいるかどうかを判定してください。
          「Yes」または「No」のどちらか一語で返答してください。
        `,
        prompt: `
          【画面上のテキスト】
          ${currentText || "（テキストはまだありません）"}
          
          【ユーザーの発話】
          ${transcription}
          
          上記の発話は、画面上のテキストに対するフィードバックを含んでいますか？
        `,
      })

      const isFeedback = text.trim().toLowerCase() === "yes"
      return NextResponse.json({ isFeedback })
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
