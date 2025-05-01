export class RealtimeAudioRecorder {
  private ws: WebSocket | null = null
  private onMessageCallback: ((data: any) => void) | null = null
  private onErrorCallback: ((error: any) => void) | null = null
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 3
  private userId: string | null = null  // ユーザーIDを保持

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
      this.userId = userId  // ユーザーIDを保存
      const wsUrl = new URL('ws://localhost:8000/ws')
      wsUrl.searchParams.append('user_id', userId)
      
      console.log(`[${new Date().toISOString()}] Setting up WebSocket for user ${userId}...`)
      this.ws = new WebSocket(wsUrl.toString())

      this.ws.onmessage = (event) => {
        if (this.onMessageCallback) {
          try {
            const data = JSON.parse(event.data)
            const receivedTime = new Date().toISOString()
            // console.log(`[${receivedTime}] WebSocket received message:`, data.type, data)
            this.onMessageCallback(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }
      }

      this.ws.onerror = (error) => {
        const errorTime = new Date().toISOString()
        console.error(`[${errorTime}] WebSocket error for user ${this.userId}:`, error)
        if (this.onErrorCallback) {
          this.onErrorCallback(error)
        }
      }

      this.ws.onclose = async (event) => {
        const closeTime = new Date().toISOString()
        console.log(`[${closeTime}] WebSocket connection closed for user ${this.userId}. Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`)
        
        if (this.reconnectAttempts < this.maxReconnectAttempts && this.userId) {
          this.reconnectAttempts++
          console.log(`[${closeTime}] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
          try {
            await this.setupWebSocket(this.userId)
          } catch (error) {
            console.error(`[${closeTime}] Reconnection failed:`, error)
          }
        } else {
          console.log(`[${closeTime}] Max reconnection attempts reached or no user ID available`)
          this.ws = null
          this.reconnectAttempts = 0
        }
      }

      // WebSocket接続が確立されるまで待機
      await new Promise<void>((resolve, reject) => {
        if (!this.ws) return reject(new Error('WebSocket not initialized'))
        
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'))
        }, 5000) // 5秒でタイムアウト

        this.ws.onopen = () => {
          const openTime = new Date().toISOString()
          console.log(`[${openTime}] WebSocket connection established for user ${this.userId}`)
          clearTimeout(timeout)
          this.reconnectAttempts = 0 // 接続成功時にリセット
          resolve()
        }
        
        this.ws.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('WebSocket connection failed'))
        }
      })
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error setting up WebSocket:`, error)
      throw error
    }
  }

  public async start(userId: string): Promise<void> {
    try {
      console.log(`[${new Date().toISOString()}] Starting WebSocket connection for user ${userId}...`)
      await this.setupWebSocket(userId)
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error starting WebSocket connection:`, error)
      this.stop()
      throw error
    }
  }

  public stop(): void {
    const stopTime = new Date().toISOString()
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`[${stopTime}] Manually closing WebSocket connection for user ${this.userId}`)
      this.ws.close(1000, "Manual close")  // 1000はnormal closureを示すコード
    }
    this.ws = null
    this.userId = null
    this.reconnectAttempts = 0
  }
}
