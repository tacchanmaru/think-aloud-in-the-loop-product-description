// lib/products.ts
export interface Product {
  id: string;
  name: string; // 商品名（例：「高機能ヘッドフォン」）
  text: string; // 商品説明文
  imagePreviewUrl: string | null; // publicディレクトリからのパス
}

// export const product1: Product = {
//   id: 'product1',
//   name: 'フェレット', // 例
//   text: `かわいい白いフェレットのぬいぐるみ。ふわふわの手触りで、デスクやお部屋のインテリアにもおすすめです。

// - 種類: フェレット
// - カラー: ホワイト
// - サイズ: 約20cm
// - 特徴: 立ち姿、ひげ付き、柔らかい手触り

// ご覧いただきありがとうございます。`,
//   imagePreviewUrl: '/images/ferret.jpeg',
// };

// export const product2: Product = {
//   id: 'product2',
//   name: 'ペンギン', // 例
//   text: `ふわふわのペンギンのぬいぐるみ。やわらかい手触りで、お子様やギフトにもぴったりです。

// - アイテム: ペンギンのぬいぐるみ
// - カラー: グレー×ホワイト
// - サイズ: 約20cm
// - 特徴: ふわふわ素材、丸いフォルム

// ご覧いただきありがとうございます。`,
//   imagePreviewUrl: '/images/penguin.jpeg',
// };


export const product1: Product = {
  id: 'product1',
  name: 'ポムポムプリン', // 例
  text: `ポムポムプリンのぬいぐるみ、黄色のギンガムチェック柄バンダナと青いオーバーオールが可愛いデザインです。

- キャラクター名: ポムポムプリン
- スタイル: ぬいぐるみ
- デザイン: ギンガムチェック柄バンダナ、青いオーバーオール付き
- サイズ: 約30cm（目安）

ご覧いただきありがとうございます。`,
  imagePreviewUrl: '/images/pom-pom-purin.jpeg',
};

export const product2: Product = {
  id: 'product2',
  name: 'クマ', // 例
  text: `赤いチェック柄のバンダナが可愛い、くまのぬいぐるみキーホルダーです。

- キャラクター: くま
- タイプ: ぬいぐるみキーホルダー
- デザイン: チェック柄バンダナ付き
- サイズ: 手のひらサイズ
- 取付け: ボールチェーン付き

ご覧いただきありがとうございます。`,
  imagePreviewUrl: '/images/bear.jpeg',
};

// Practice mode data (shared between manual and think-aloud experiments)
export const practiceData: Product = {
  id: 'practice',
  name: 'リラックマ',
  text: `リラックマのぬいぐるみ、黄色いヘルメットと巻物を持った可愛いデザインです。

- キャラクター名: リラックマ
- アイテム: ぬいぐるみ
- デザイン: 黄色いヘルメット・巻物付き
- サイズ: 約23cm（目安）
- 特徴: やわらかい手触り

ご覧いただきありがとうございます。`,
  imagePreviewUrl: '/images/rilakkuma.jpeg',
};