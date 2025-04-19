export async function processCorrection(originalText: string, feedback: string): Promise<string> {
  try {
    if (!originalText || !feedback) {
      throw new Error("Original text and feedback are required")
    }

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        originalText,
        feedback,
      }),
    })

    // レスポンスが成功しなかった場合
    if (!response.ok) {
      // レスポンスがJSONかどうかを確認
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error: ${response.status} ${response.statusText}`)
      } else {
        // JSONでない場合はテキストとして読み込む
        const errorText = await response.text()
        throw new Error(`Error: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}...`)
      }
    }

    // レスポンスがJSONかどうかを確認
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text()
      throw new Error(`Expected JSON response but got: ${contentType} - ${text.substring(0, 100)}...`)
    }

    const data = await response.json()

    if (!data.result) {
      throw new Error("Response does not contain a result field")
    }

    return data.result
  } catch (error) {
    console.error("Error in processCorrection:", error)
    throw error
  }
}

// フィードバックかどうかを判定する関数
export async function isFeedback(text: string, currentText: string): Promise<boolean> {
  try {
    if (!text) {
      return false
    }

    const response = await fetch("/api/check-feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transcription: text,
        currentText: currentText,
      }),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.isFeedback
  } catch (error) {
    console.error("Error checking if text is feedback:", error)
    return false
  }
}

// 修正提案を生成する関数
export async function generateCorrectionSuggestion(originalText: string, feedback: string): Promise<string> {
  try {
    if (!originalText || !feedback) {
      throw new Error("Original text and feedback are required")
    }

    const response = await fetch("/api/suggest-correction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        originalText,
        feedback,
      }),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.suggestion
  } catch (error) {
    console.error("Error generating correction suggestion:", error)
    throw error
  }
}

// 修正を適用する関数
export async function applyCorrectionSuggestion(
  originalText: string,
  suggestion: string,
  feedback: string,
): Promise<string> {
  try {
    if (!originalText || !suggestion) {
      throw new Error("Original text and suggestion are required")
    }

    const response = await fetch("/api/apply-correction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        originalText,
        suggestion,
        feedback,
      }),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.result
  } catch (error) {
    console.error("Error applying correction:", error)
    throw error
  }
}
