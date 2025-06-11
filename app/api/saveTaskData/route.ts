// src/app/api/saveTaskData/route.ts
import { NextResponse } from 'next/server';
import { firestoreDb } from '@/lib/firebaseAdmin'; // Admin SDKのDBインスタンス
import type { ExperimentResult, ManualExperimentResult, ThinkAloudExperimentResult } from '@/lib/types'; // 型をインポート
// import admin from 'firebase-admin'; // serverTimestamp を使わないので不要になる

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as ExperimentResult; // クライアントから送られてくるデータ本体

    // バリデーション
    if (!data.userId || !data.experimentType || !data.productId) {
      return NextResponse.json({ message: '必須項目 (userId, experimentType, productId) が不足しています。' }, { status: 400 });
    }

    const userId = data.userId; // ドキュメントIDとして使用
    let fieldToUpdate: string;
    let dataToStore: ManualExperimentResult | ThinkAloudExperimentResult;

    // experimentType に応じて、保存するフィールド名とデータを決定
    if (data.experimentType === "manual") {
      fieldToUpdate = "baseline_manual_result"; // フィールド名を定義
      dataToStore = data as ManualExperimentResult;
    } else if (data.experimentType === "think-aloud") {
      fieldToUpdate = "think_aloud_result"; // フィールド名を定義
      dataToStore = data as ThinkAloudExperimentResult;
    } else {
      return NextResponse.json({ message: '無効な experimentType です。' }, { status: 400 });
    }

    // Firestoreに保存するデータオブジェクトを作成
    // { [computedPropertyName]: value } の形式で動的にプロパティを設定
    const updateData = {
      [fieldToUpdate]: dataToStore,
      // lastUpdatedAt は不要なので削除
    };

    // パス: experiments/exp-1/task/{userId}
    const docRef = firestoreDb
      .collection("experiments")    // トップレベルコレクション
      .doc("exp-1")                 // 実験セッションのドキュメント
      .collection("task")           // "task" サブコレクション
      .doc(userId);                 // ドキュメントIDに userId を使用

    await docRef.set(updateData, { merge: true }); // merge: true で既存フィールドを保持しつつ更新

    return NextResponse.json({
      message: `実験タスクデータ (${data.experimentType}) がユーザーID ${userId} のドキュメントに保存/更新されました。`,
      id: userId, // ドキュメントIDはuserId
      path: docRef.path
    }, { status: 200 });

  } catch (error: any) {
    console.error('API Error saving experiment task data:', error);
    return NextResponse.json({ message: `タスクデータ保存エラー: ${error.message || '不明なエラー'}` }, { status: 500 });
  }
}