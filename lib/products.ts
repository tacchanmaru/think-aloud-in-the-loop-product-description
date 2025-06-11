// lib/products.ts
export interface Product {
  id: string;
  name: string; // 商品名（例：「高機能ヘッドフォン」）
  text: string; // 商品説明文
  imagePreviewUrl: string | null; // publicディレクトリからのパス
}

export const product1: Product = {
  id: 'product1',
  name: 'フェレット', // 例
  text: `ふわふわの白いイタチのぬいぐるみ。黒いしっぽとつぶらな瞳がかわいらしいデザインです。

- 種類: イタチのぬいぐるみ
- カラー: ホワイト（しっぽは黒）
- 特徴: ふわふわ素材、可愛い表情
- サイズ: 約20cm（目安）

ご覧いただきありがとうございます。`,
  imagePreviewUrl: '/images/ferret.jpeg', // public/images/headphone.jpg を想定
};

export const product2: Product = {
  id: 'product2',
  name: 'ポムポムプリン', // 例
  text: `ポムポムプリンのかわいいぬいぐるみ、チェック柄エプロンと青い服が特徴です。

- キャラクター名: ポムポムプリン
- アイテム: ぬいぐるみ
- デザイン: チェック柄エプロン、青い服
- サイズ: 約30cm（目安）

ご覧いただきありがとうございます。`,
  imagePreviewUrl: '/images/pom-pom-purin.jpeg', // public/images/smartwatch.jpg を想定
};