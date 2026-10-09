// 英単語リスト (難易度別)
export const WORDS = {
  easy: [
    "cat", "dog", "run", "sun", "hat", "box", "cup", "red", "big", "sit",
    "pen", "bag", "map", "top", "net", "jam", "leg", "arm", "eye", "ear",
    "bed", "bus", "car", "day", "egg", "fan", "gas", "ice", "job", "key",
  ],
  medium: [
    "apple", "beach", "chair", "dance", "eagle", "flame", "grape", "house",
    "juice", "knife", "lemon", "magic", "night", "ocean", "piano", "queen",
    "river", "snake", "tiger", "under", "voice", "water", "youth", "zebra",
    "brain", "clock", "dream", "earth", "field", "glass", "heart", "image",
  ],
  hard: [
    "amazing", "balance", "capture", "diamond", "element", "fantasy",
    "general", "harmony", "imagine", "journey", "kitchen", "library",
    "mystery", "nuclear", "organic", "perfect", "quantum", "rainbow",
    "science", "thunder", "unicorn", "volcano", "warrior", "xylophone",
    "butterfly", "chocolate", "dangerous", "excellent", "frequency",
  ],
};

export type Difficulty = keyof typeof WORDS;

export function getRandomWord(difficulty: Difficulty): string {
  const list = WORDS[difficulty];
  return list[Math.floor(Math.random() * list.length)];
}

export function getDifficultyByScore(score: number): Difficulty {
  if (score < 50) return "easy";
  if (score < 150) return "medium";
  return "hard";
}
