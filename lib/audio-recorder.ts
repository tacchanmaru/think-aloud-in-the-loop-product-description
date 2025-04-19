export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private isRecording = false
  private onTranscriptCallback: ((text: string, isFinal: boolean) => void) | null = null
  private onErrorCallback: ((error: Error) => void) | null = null
  private onStopCallback: (() => void) | null = null
  private audioChunks: Blob[] = []
  private processingInterval: NodeJS.Timeout | null = null

  constructor() {}

  public async start(): Promise<void> {
    try {
      if (this.isRecording) {
        return
      }

      this.audioChunks = []

      // マイクからの音声ストリームを取得
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      // MediaRecorderの設定
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: "audio/webm",
      })

      this.mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      })

      this.mediaRecorder.addEventListener("error", (event) => {
        if (this.onErrorCallback) {
          this.onErrorCallback(new Error("MediaRecorder error"))
        }
      })

      // 録音開始 - 5秒間隔で送信
      this.mediaRecorder.start(5000) // 5秒ごとにデータを取得
      this.isRecording = true

      // 定期的に音声データを処理
      this.processingInterval = setInterval(() => {
        this.processAudioChunks()
      }, 5000) // 5秒ごとに処理
    } catch (error) {
      console.error("Error starting recording:", error)
      if (this.onErrorCallback) {
        this.onErrorCallback(error instanceof Error ? error : new Error(String(error)))
      }
      throw error
    }
  }

  private async processAudioChunks(): Promise<void> {
    if (this.audioChunks.length === 0) return

    try {
      // 複数のチャンクを1つのBlobに結合
      const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" })
      this.audioChunks = [] // バッファをクリア

      // サーバーに送信して文字起こし
      const formData = new FormData()
      formData.append("audio", audioBlob)

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server error: ${response.status} ${errorText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.text && this.onTranscriptCallback) {
        this.onTranscriptCallback(data.text, true)
      }
    } catch (error) {
      console.error("Error processing audio chunks:", error)
      if (this.onErrorCallback) {
        this.onErrorCallback(error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRecording) {
      return
    }

    // 処理インターバルを停止
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }

    // 最後の音声チャンクを処理
    await this.processAudioChunks()

    // MediaRecorderの停止
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop()
      this.mediaRecorder = null
    }

    // ストリームのトラックを停止
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }

    this.isRecording = false

    if (this.onStopCallback) {
      this.onStopCallback()
    }
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
