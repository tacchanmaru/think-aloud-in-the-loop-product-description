export class RealtimeAudioRecorder {
  private ws: WebSocket | null = null
  private onMessageCallback: ((data: any) => void) | null = null
  private onErrorCallback: ((error: Event) => void) | null = null
  private onStopCallback: (() => void) | null = null

  constructor() {}

  public start(): void {
    try {
      // WebSocket接続の確立
      const wsUrl = "ws://localhost:8000/ws"
      console.log("Attempting WebSocket connection to:", wsUrl)
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log("Backend WebSocket connection established")
      }

      this.ws.onclose = (event) => {
        console.log("Backend WebSocket connection closed with code:", event.code, "reason:", event.reason)
        this.cleanup()
        if (this.onStopCallback) {
          this.onStopCallback()
        }
      }

      this.ws.onerror = (error) => {
        console.error("Backend WebSocket error:", error)
        if (this.onErrorCallback) {
          this.onErrorCallback(error)
        }
        this.cleanup()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("Received message from backend:", data)
          if (this.onMessageCallback) {
            this.onMessageCallback(data)
          }
        } catch (error) {
          console.error("Error parsing backend WebSocket message:", error)
        }
      }
    } catch (error) {
      console.error("Error starting WebSocket connection:", error)
      if (this.onErrorCallback) {
        this.onErrorCallback(error instanceof Event ? error : new Event(String(error)))
      }
    }
  }

  public stop(): void {
    this.cleanup()
    console.log("WebSocket connection stopped by client")
    if (this.onStopCallback) {
      this.onStopCallback()
    }
  }

  private cleanup(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  public onMessage(callback: (data: any) => void): void {
    this.onMessageCallback = callback
  }

  public onStop(callback: () => void): void {
    this.onStopCallback = callback
  }

  public onError(callback: (error: Event) => void): void {
    this.onErrorCallback = callback
  }

  public isActive(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN
  }
}
