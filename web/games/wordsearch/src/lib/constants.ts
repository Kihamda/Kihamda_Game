/** グリッドサイズ */
export const GRID_SIZE = 10;

/** セルサイズ (px) */
export const CELL_SIZE = 36;

/** 単語リスト (カタカナで配置、検索もカタカナ) */
export const WORD_LISTS: Record<string, string[]> = {
  animals: [
    "イヌ",
    "ネコ",
    "トリ",
    "ウマ",
    "サル",
    "ウシ",
    "ヒツジ",
    "ブタ",
    "クマ",
    "キツネ",
  ],
  food: [
    "リンゴ",
    "ミカン",
    "バナナ",
    "イチゴ",
    "ブドウ",
    "スイカ",
    "モモ",
    "カキ",
    "ナシ",
    "メロン",
  ],
  nature: [
    "ヤマ",
    "カワ",
    "ウミ",
    "ソラ",
    "ホシ",
    "ツキ",
    "ハナ",
    "キ",
    "モリ",
    "タイヨウ",
  ],
};

/** デフォルトカテゴリ */
export const DEFAULT_CATEGORY = "animals";

/** 配置する単語数 */
export const WORDS_TO_PLACE = 6;

/** ランダム文字(カタカナ) */
export const RANDOM_CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";

/** localStorage キー */
export const STORAGE_KEY = "wordsearch_besttime";
