import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// OpenAIクライアントの初期化 - APIキーがある場合のみ初期化
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

export async function POST(req: NextRequest) {
  try {
    // リクエストからオーディオデータを取得
    const formData = await req.formData()
    const audioBlob = formData.get("audio") as Blob

    if (!audioBlob) {
      return NextResponse.json({ error: "Audio data is required" }, { status: 400 })
    }

    // APIキーが設定されているか確認
    if (!process.env.OPENAI_API_KEY || !openai) {
      console.error("OPENAI_API_KEY is not set")
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable." },
        { status: 500 },
      )
    }

    try {
      // OpenAIのTranscriptionAPIを呼び出し
      const transcription = await openai.audio.transcriptions.create({
        file: new File([audioBlob], "audio.webm", { type: "audio/webm" }),
        model: "whisper-1",
        language: "ja",
      })

      return NextResponse.json({ text: transcription.text })
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
