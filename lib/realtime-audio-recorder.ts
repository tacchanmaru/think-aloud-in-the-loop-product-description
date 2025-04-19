export class RealtimeAudioRecorder {
  private socket: WebSocket | null = null
  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private mediaRecorder: MediaRecorder | null = null
  private isRecording = false
  private onTranscriptCallback: ((text: string, isFinal: boolean) => void) | null = null
  private onErrorCallback: ((error: Error) => void) | null = null
  private onStopCallback: (() => void) | null = null
  private audioProcessor: ScriptProcessorNode | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private chunks: Float32Array[] = []

  constructor() {}

  public async start(): Promise<void> {
    try {
      if (this.isRecording) {
        return
      }

      // APIキーの取得
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || ""
      if (!apiKey) {
        throw new Error("OpenAI API key is not set")
      }

      // WebSocket接続の確立
      this.socket = new WebSocket("wss://api.openai.com/v1/audio/transcriptions", ["authorization", `Bearer ${apiKey}`])

      // WebSocketイベントハンドラの設定
      this.socket.onopen = this.handleSocketOpen.bind(this)
      this.socket.onmessage = this.handleSocketMessage.bind(this)
      this.socket.onerror = this.handleSocketError.bind(this)
      this.socket.onclose = this.handleSocketClose.bind(this)

      // マイクからの音声ストリームを取得
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      // AudioContextの設定
      this.audioContext = new AudioContext({
        sampleRate: 16000,
      })

      // 音声ソースノードの作成
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream)

      // ScriptProcessorNodeの作成（バッファサイズ4096、入力1チャンネル、出力1チャンネル）
      this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1)
      this.audioProcessor.onaudioprocess = this.handleAudioProcess.bind(this)

      // ノードの接続
      this.sourceNode.connect(this.audioProcessor)
      this.audioProcessor.connect(this.audioContext.destination)

      this.isRecording = true
      console.log("Recording started with WebSocket")
    } catch (error) {
      console.error("Error starting recording:", error)
      if (this.onErrorCallback) {
        this.onErrorCallback(error instanceof Error ? error : new Error(String(error)))
      }
      this.cleanup()
      throw error
    }
  }

  private handleSocketOpen(): void {
    console.log("WebSocket connection established")

    // 開始メッセージを送信
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          action: "start",
          model: "whisper-1",
          language: "ja",
        }),
      )
    }
  }

  private handleSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data)
      console.log("Received transcription:", data)

      if (this.onTranscriptCallback && data.text) {
        this.onTranscriptCallback(data.text, !!data.is_final)
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error)
    }
  }

  private handleSocketError(event: Event): void {
    console.error("WebSocket error:", event)
    if (this.onErrorCallback) {
      this.onErrorCallback(new Error("WebSocket error occurred"))
    }
  }

  private handleSocketClose(event: CloseEvent): void {
    console.log("WebSocket connection closed:", event.code, event.reason)
    this.cleanup()
  }

  private handleAudioProcess(event: AudioProcessingEvent): void {
    if (!this.isRecording || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return
    }

    // 入力バッファから音声データを取得
    const inputBuffer = event.inputBuffer
    const inputData = inputBuffer.getChannelData(0)

    // Float32Arrayを16bit PCMに変換
    const pcmData = this.floatTo16BitPCM(inputData)

    // WebSocketで送信
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(pcmData.buffer)
    }
  }

  private floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      // Float32Array の値は -1.0 から 1.0 の範囲
      // Int16Array の値は -32768 から 32767 の範囲
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return int16Array
  }

  public stop(): void {
    if (!this.isRecording) {
      return
    }

    // 停止メッセージを送信
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: "stop" }))
    }

    this.cleanup()

    if (this.onStopCallback) {
      this.onStopCallback()
    }
  }

  private cleanup(): void {
    // AudioProcessorの切断
    if (this.audioProcessor) {
      this.audioProcessor.disconnect()
      this.audioProcessor = null
    }

    // SourceNodeの切断
    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    // AudioContextの停止
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(console.error)
      this.audioContext = null
    }

    // MediaStreamのトラックを停止
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }

    // WebSocketの切断
    if (this.socket && this.socket.readyState < WebSocket.CLOSING) {
      this.socket.close()
      this.socket = null
    }

    this.isRecording = false
    console.log("Recording stopped and resources cleaned up")
  }

  public onTranscript(callback: (text: string, isFinal: boolean) => void): void {
    this.onTranscriptCallback = callback
  }

  public onStop(callback: () => void): void {
    this.onStopCallback = callback
  }

  public onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback
  }

  public isActive(): boolean {
    return this.isRecording
  }
}
