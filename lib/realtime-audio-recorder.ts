export class RealtimeAudioRecorder {
  private ws: WebSocket | null = null
  private mediaStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private mediaRecorder: MediaRecorder | null = null
  private onMessageCallback: ((data: any) => void) | null = null
  private onErrorCallback: ((error: any) => void) | null = null

  constructor() {}

  public onMessage(callback: (data: any) => void) {
    this.onMessageCallback = callback
  }

  public onError(callback: (error: any) => void) {
    this.onErrorCallback = callback
  }

  public isActive(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  private async setupWebSocket(userId: string): Promise<void> {
    try {
      // WebSocketのURLにユーザーIDをクエリパラメータとして追加
      const wsUrl = new URL('ws://localhost:8000/ws')
      wsUrl.searchParams.append('user_id', userId)
      this.ws = new WebSocket(wsUrl.toString())

      this.ws.onmessage = (event) => {
        if (this.onMessageCallback) {
          try {
            const data = JSON.parse(event.data)
            this.onMessageCallback(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }
      }

      this.ws.onerror = (error) => {
        if (this.onErrorCallback) {
          this.onErrorCallback(error)
        }
      }

      // WebSocket接続が確立されるまで待機
      await new Promise<void>((resolve, reject) => {
        if (!this.ws) return reject(new Error('WebSocket not initialized'))
        this.ws.onopen = () => resolve()
        this.ws.onerror = () => reject(new Error('WebSocket connection failed'))
      })
    } catch (error) {
      console.error('Error setting up WebSocket:', error)
      throw error
    }
  }

  public async start(userId: string): Promise<void> {
    try {
      // WebSocket接続を設定
      await this.setupWebSocket(userId)

      // マイクの使用許可を要求
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.audioContext = new AudioContext()

      // MediaRecorderの設定
      this.mediaRecorder = new MediaRecorder(this.mediaStream)

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(event.data)
        }
      }

      // 録音開始
      this.mediaRecorder.start(250) // 250msごとにデータを送信
    } catch (error) {
      console.error('Error starting recording:', error)
      this.stop()
      throw error
    }
  }

  public stop(): void {
    // MediaRecorderの停止
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }

    // AudioContextの停止
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
    }

    // MediaStreamのトラックを停止
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
    }

    // WebSocket接続を閉じる
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close()
    }

    // リソースをクリア
    this.mediaRecorder = null
    this.audioContext = null
    this.mediaStream = null
    this.ws = null
  }
}
