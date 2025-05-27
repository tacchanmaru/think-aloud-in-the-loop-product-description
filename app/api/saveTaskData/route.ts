// src/app/api/saveTaskData/route.ts
import { NextResponse } from 'next/server';
import { firestoreDb } from '@/lib/firebaseAdmin'; // Admin SDKのDBインスタンス
import type { ExperimentResult } from '@/lib/types'; // タスクデータの型
import admin from 'firebase-admin'; // serverTimestamp() のため

export async function POST(request: Request) {
  try {
    // クライアントからはタスクデータ本体のみ受け取る
    const data = (await request.json()) as ExperimentResult;

    // 簡単なバリデーション (必要に応じて詳細化)
    if (!data.userId || !data.experimentType || !data.productId) {
      return NextResponse.json({ message: '必須項目 (userId, experimentType, productId) が不足しています。' }, { status: 400 });
    }

    const dataToSave = {
      ...data,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(), // サーバー側のタイムスタンプ
    };

    const docRef = await firestoreDb.collection("experiments").doc("exp-1").collection("task").add(dataToSave);

    return NextResponse.json({ message: '実験タスクデータが正常に保存されました。', id: docRef.id }, { status: 201 });
  } catch (error: any) {
    console.error('API Error saving experiment task data:', error);
    return NextResponse.json({ message: `タスクデータ保存エラー: ${error.message || '不明なエラー'}` }, { status: 500 });
  }
}
