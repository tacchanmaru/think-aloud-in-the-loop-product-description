import { Server } from "socket.io"
import { NextApiRequest } from "next"
import { NextApiResponse } from "next"

const io = new Server({
  path: "/api/socket",
  addTrailingSlash: false,
})

io.on("connection", (socket) => {
  console.log("Client connected")

  socket.on("disconnect", () => {
    console.log("Client disconnected")
  })

  socket.on("audio_data", (data) => {
    // OpenAIのAPIに音声データを送信
    // ここでOpenAIのAPIとの通信を実装
  })
})

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    if (!res.socket.server.io) {
      res.socket.server.io = io
    }
    res.end()
  } else {
    res.status(405).json({ error: "Method not allowed" })
  }
} 