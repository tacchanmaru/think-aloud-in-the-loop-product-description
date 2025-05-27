// lib/experimentUtils.ts
import { product1, product2, type Product } from './products';

export enum ExperimentPageType {
  BaselineManual = 'baseline-manual',
  ThinkAloud = 'think-aloud',
}

export function getProductForExperiment(userIdString: string | null, pageType: ExperimentPageType): Product | null {
  if (!userIdString) {
    console.error("User ID is null, cannot determine product.");
    return null; // Or return a default product if appropriate
  }

  const numericUserId = parseInt(userIdString, 10);

  if (isNaN(numericUserId)) {
    console.error(`Invalid User ID format: ${userIdString}. Cannot parse to number.`);
    // 数値に変換できない場合、デフォルトの商品を返すかエラー処理
    // 例として、baseline-manualなら商品1、think-aloudなら商品2を返す（実験設計による）
    return pageType === ExperimentPageType.BaselineManual ? product1 : product2;
  }

  const remainder = numericUserId % 4;

  if (pageType === ExperimentPageType.BaselineManual) {
    if (remainder === 0 || remainder === 3) {
      return product1;
    } else { // remainder === 1 || remainder === 2
      return product2;
    }
  } else if (pageType === ExperimentPageType.ThinkAloud) {
    if (remainder === 0 || remainder === 3) {
      return product2;
    } else { // remainder === 1 || remainder === 2
      return product1;
    }
  }

  return null; // 万が一、pageTypeが想定外の場合
}