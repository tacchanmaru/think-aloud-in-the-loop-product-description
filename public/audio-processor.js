class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.port.onmessage = this.handleMessage.bind(this)
  }

  handleMessage(event) {
    // メッセージの処理
  }

  process(inputs, outputs) {
    const input = inputs[0]
    const output = outputs[0]

    // 入力バッファから音声データを取得
    const inputData = input[0]
    if (!inputData) return true

    // Float32Arrayを16bit PCMに変換
    const pcmData = this.floatTo16BitPCM(inputData)
    
    // Base64エンコード
    const base64Audio = this.arrayBufferToBase64(pcmData.buffer)
    
    // メッセージを送信
    this.port.postMessage({ audio: base64Audio })

    // 出力バッファにデータをコピー
    output[0].set(inputData)

    return true
  }

  floatTo16BitPCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      // Float32Array の値は -1.0 から 1.0 の範囲
      // Int16Array の値は -32768 から 32767 の範囲
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return int16Array
  }

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ""
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return this.btoa(binary)
  }

  btoa(str) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
    let result = ""
    let i = 0
    let chr1, chr2, chr3
    let enc1, enc2, enc3, enc4

    while (i < str.length) {
      chr1 = str.charCodeAt(i++)
      chr2 = str.charCodeAt(i++)
      chr3 = str.charCodeAt(i++)

      enc1 = chr1 >> 2
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4)
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6)
      enc4 = chr3 & 63

      if (isNaN(chr2)) {
        enc3 = enc4 = 64
      } else if (isNaN(chr3)) {
        enc4 = 64
      }

      result += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4)
    }

    return result
  }
}

registerProcessor("audio-processor", AudioProcessor) 