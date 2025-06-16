// src/lib/types.ts
export type ExperimentType = "manual" | "think-aloud";

export interface IntermediateStep {
  utterance: string;
  edit_plan: string; // AIによる修正提案や計画
  modified_text: string; // AIによって実際に修正されたテキスト
}

// Firebaseに保存する基本データ構造
export interface BaseExperimentData {
  userId: string;
  experimentType: ExperimentType;
  productId: string;
  originalText: string;
  finalText: string;
  startTime: string; // ISO形式
  endTime: string;   // ISO形式
  durationSeconds: number;
  isPracticeMode?: boolean;
}

// Manual実験の結果データ型
export interface ManualExperimentResult extends BaseExperimentData {
  experimentType: "manual";
}

// ThinkAloud実験の結果データ型
export interface ThinkAloudExperimentResult extends BaseExperimentData {
  experimentType: "think-aloud";
  intermediateSteps: IntermediateStep[];
}

// 上記2つの型のUnion型
export type ExperimentResult = ManualExperimentResult | ThinkAloudExperimentResult;
