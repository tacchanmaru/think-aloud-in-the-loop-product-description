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
  text: `かわいい白いフェレットのぬいぐるみ。ふわふわの手触りで、デスクやお部屋のインテリアにもおすすめです。

- 種類: フェレット
- カラー: ホワイト
- サイズ: 約20cm
- 特徴: 立ち姿、ひげ付き、柔らかい手触り

ご覧いただきありがとうございます。`,
  imagePreviewUrl: '/images/ferret.jpeg',
};

export const product2: Product = {
  id: 'product2',
  name: 'ペンギン', // 例
  text: `ふわふわのペンギンのぬいぐるみ。やわらかい手触りで、お子様やギフトにもぴったりです。

- アイテム: ペンギンのぬいぐるみ
- カラー: グレー×ホワイト
- サイズ: 約20cm
- 特徴: ふわふわ素材、丸いフォルム

ご覧いただきありがとうございます。`,
  imagePreviewUrl: '/images/penguin.jpeg',
};

// export const product1: Product = {
//   id: 'product1',
//   name: 'バッグ', // 例
//   text: `東京大学のロゴが印象的なシンプルなトートバッグ。A4サイズの書類やノートがすっきり入る大きさです。

// - デザイン: 東京大学ロゴ入り（プリントは紙をテープで固定）
// - カラー: ナチュラル（生成り）
// - 素材: キャンバス地
// - サイズ: A4対応
// - 持ち手: 肩掛け可能

// ご覧いただきありがとうございます。`,
//   imagePreviewUrl: '/images/bag.jpeg',
// };

// export const product2: Product = {
//   id: 'product2',
//   name: 'バッグ', // 例
//   text: `東京大学のロゴが印象的なシンプルなトートバッグ。A4サイズの書類やノートがすっきり入る大きさです。

// - デザイン: 東京大学ロゴ入り（プリントは紙をテープで固定）
// - カラー: ナチュラル（生成り）
// - 素材: キャンバス地
// - サイズ: A4対応
// - 持ち手: 肩掛け可能

// ご覧いただきありがとうございます。`,
//   imagePreviewUrl: '/images/bag.jpeg',
// };

// Practice mode data (shared between manual and think-aloud experiments)
export const practiceData: Product = {
  id: 'practice',
  name: '鉛筆',
  text: `東京大学のロゴが刻印されたシンプルな黒鉛筆です。勉強や仕事のお供にぴったりです。

- ブランド・刻印: 東京大学
- カラー: ブラック
- 種類: 鉛筆
- 特徴: ロゴ入り、シンプルデザイン

ご覧いただきありがとうございます。`,
  imagePreviewUrl: '/images/pencil.jpeg',
};
