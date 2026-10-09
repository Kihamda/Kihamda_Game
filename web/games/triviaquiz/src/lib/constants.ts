import type { Question } from "./types";

/** 出題数 */
export const TOTAL_QUESTIONS = 10;

/** localStorage キー */
export const STORAGE_KEY = "triviaquiz_highscore";

/** クイズ問題プール (15問) */
export const QUESTION_POOL: Question[] = [
  {
    question: "日本で一番高い山は？",
    choices: ["北岳", "穂高岳", "富士山", "槍ヶ岳"],
    correctIndex: 2,
  },
  {
    question: "太陽系で最も大きい惑星は？",
    choices: ["土星", "天王星", "木星", "海王星"],
    correctIndex: 2,
  },
  {
    question: "「鳥獣戯画」が描かれた時代は？",
    choices: ["奈良時代", "平安時代", "鎌倉時代", "室町時代"],
    correctIndex: 1,
  },
  {
    question: "水の化学式は？",
    choices: ["CO2", "H2O", "NaCl", "O2"],
    correctIndex: 1,
  },
  {
    question: "「ひまわり」で有名な画家は？",
    choices: ["ピカソ", "モネ", "ゴッホ", "ダリ"],
    correctIndex: 2,
  },
  {
    question: "日本の国技は？",
    choices: ["柔道", "剣道", "相撲", "空手"],
    correctIndex: 2,
  },
  {
    question: "1年で最も日が長い日は？",
    choices: ["春分", "夏至", "秋分", "冬至"],
    correctIndex: 1,
  },
  {
    question: "人間の体で最も硬い部分は？",
    choices: ["骨", "爪", "歯のエナメル質", "髪の毛"],
    correctIndex: 2,
  },
  {
    question: "世界で最も面積が大きい国は？",
    choices: ["中国", "アメリカ", "カナダ", "ロシア"],
    correctIndex: 3,
  },
  {
    question: "光の三原色に含まれないのは？",
    choices: ["赤", "緑", "青", "黄"],
    correctIndex: 3,
  },
  {
    question: "「吾輩は猫である」の作者は？",
    choices: ["芥川龍之介", "太宰治", "夏目漱石", "森鷗外"],
    correctIndex: 2,
  },
  {
    question: "地球の自転周期はおよそ何時間？",
    choices: ["12時間", "18時間", "24時間", "36時間"],
    correctIndex: 2,
  },
  {
    question: "源頼朝が開いた幕府は？",
    choices: ["室町幕府", "江戸幕府", "鎌倉幕府", "足利幕府"],
    correctIndex: 2,
  },
  {
    question: "オリンピックの五輪の色に含まれないのは？",
    choices: ["黒", "紫", "緑", "赤"],
    correctIndex: 1,
  },
  {
    question: "血液型の中で日本人に最も多いのは？",
    choices: ["A型", "B型", "O型", "AB型"],
    correctIndex: 0,
  },
];