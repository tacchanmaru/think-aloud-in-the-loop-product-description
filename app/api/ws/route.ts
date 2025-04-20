import { NextResponse } from "next/server"
import { WebSocket } from "ws"

export async function GET(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key is not set" }, { status: 500 })
  }

  const wsUrl = new URL("wss://api.openai.com/v1/realtime")
  wsUrl.searchParams.append("intent", "transcription")

  const ws = new WebSocket(wsUrl.toString(), {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "OpenAI-Beta": "realtime=v1"
    }
  })

  // WebSocketの接続を確立
  await new Promise((resolve, reject) => {
    ws.on("open", resolve)
    ws.on("error", reject)
  })

  // WebSocketの接続を返す
  return new NextResponse(null, {
    status: 101,
    headers: {
      "Upgrade": "websocket",
      "Connection": "Upgrade",
      "Sec-WebSocket-Accept": req.headers.get("Sec-WebSocket-Key") || "",
    },
  })
} 