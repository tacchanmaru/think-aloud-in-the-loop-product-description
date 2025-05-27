// src/lib/experimentService.ts
import type { ExperimentResult } from './types'; // タスクデータの型

/**
 * 実験タスクデータをバックエンドAPI経由で保存します。
 * @param data 保存する実験タスクデータ
 * @returns 保存処理の結果 { success: boolean, message?: string, data?: any, error?: any }
 */
export async function saveExperimentTaskData( // 関数名変更 (saveExperimentData から)
  data: ExperimentResult
): Promise<{ success: boolean; message?: string; data?: any; error?: any }> {
  try {
    const response = await fetch('/api/saveTaskData', { // APIルートのパス
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data), // データ本体のみ送信
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('実験タスクデータの保存に失敗しました (API):', responseData);
      return { success: false, message: responseData.message || 'サーバーエラーが発生しました。', error: responseData };
    }

    console.log('実験タスクデータが正常に保存されました (API経由):', responseData);
    return { success: true, message: responseData.message, data: responseData };
  } catch (error) {
    console.error('saveExperimentTaskDataサービスでクライアント側エラー:', error);
    return { success: false, message: 'タスクデータ保存中にクライアント側でエラーが発生しました。', error };
  }
}