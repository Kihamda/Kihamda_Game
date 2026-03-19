// 英単語辞書 (しりとり用によく使われる単語)
export const WORDS: string[] = [
  // 基本3-4文字
  "cat", "dog", "run", "sun", "hat", "box", "cup", "red", "big", "sit",
  "pen", "bag", "map", "top", "net", "jam", "leg", "arm", "eye", "ear",
  "bed", "bus", "car", "day", "egg", "fan", "gas", "ice", "job", "key",
  "ant", "bat", "cow", "dot", "end", "fly", "gym", "hop", "ink", "joy",
  // 5-6文字
  "apple", "beach", "chair", "dance", "eagle", "flame", "grape", "house",
  "juice", "knife", "lemon", "magic", "night", "ocean", "piano", "queen",
  "river", "snake", "tiger", "under", "voice", "water", "youth", "zebra",
  "brain", "clock", "dream", "earth", "field", "glass", "heart", "image",
  "light", "music", "paper", "radio", "space", "train", "world", "cloud",
  "sweet", "stone", "sport", "storm", "story", "study", "style", "sugar",
  // 7文字以上
  "amazing", "balance", "capture", "diamond", "element", "fantasy",
  "general", "harmony", "imagine", "journey", "kitchen", "library",
  "mystery", "natural", "organic", "perfect", "quality", "rainbow",
  "science", "thunder", "unicorn", "volcano", "warrior", "example",
  "butterfly", "chocolate", "dangerous", "excellent", "frequency",
  "generate", "hospital", "industry", "kangaroo", "language", "mountain",
  "neighbor", "original", "question", "remember", "sandwich", "together",
  "umbrella", "vacation", "wonderful", "yourself", "absolute", "abstract",
  // 特定の文字で始まる/終わる単語を追加
  "yellow", "window", "winner", "winter", "wonder", "woman", "woman",
  "energy", "enjoy", "enter", "entire", "entry", "equal", "escape",
  "event", "every", "exact", "exist", "extra", "early", "effort",
  "orange", "option", "order", "other", "outer", "owner", "object",
  "round", "royal", "rural", "region", "result", "return", "review",
  "name", "near", "neck", "need", "nerve", "never", "noise", "north",
  "table", "taste", "teach", "teeth", "tell", "test", "thank", "thing",
  "young", "year", "yard", "yell", "yawn", "yield", "yoga", "yoke",
];

// 単語セット (小文字化して重複排除)
export const WORD_SET = new Set(WORDS.map((w) => w.toLowerCase()));

// 最後の文字を取得
export function getLastChar(word: string): string {
  return word.charAt(word.length - 1).toLowerCase();
}

// 最初の文字を取得
export function getFirstChar(word: string): string {
  return word.charAt(0).toLowerCase();
}

// 指定した文字で始まる単語があるか確認
export function hasWordStartingWith(char: string): boolean {
  return WORDS.some((w) => getFirstChar(w) === char.toLowerCase());
}

// 単語が辞書に存在するか確認
export function isValidWord(word: string): boolean {
  return WORD_SET.has(word.toLowerCase());
}

// しりとりのルールに合致するか確認
export function isValidChain(previousWord: string, newWord: string): boolean {
  const lastChar = getLastChar(previousWord);
  const firstChar = getFirstChar(newWord);
  return lastChar === firstChar;
}

// 指定した文字で始まるランダムな単語を取得
export function getRandomWordStartingWith(
  char: string,
  excludeWords: Set<string>
): string | null {
  const candidates = WORDS.filter(
    (w) =>
      getFirstChar(w) === char.toLowerCase() &&
      !excludeWords.has(w.toLowerCase())
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// 開始用のランダムな単語を取得
export function getStartingWord(): string {
  // 終わりの文字で始まる単語が多い単語を優先
  const goodStarters = WORDS.filter((w) => {
    const lastChar = getLastChar(w);
    return WORDS.filter((w2) => getFirstChar(w2) === lastChar).length >= 3;
  });
  const list = goodStarters.length > 0 ? goodStarters : WORDS;
  return list[Math.floor(Math.random() * list.length)];
}
