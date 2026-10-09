// タイピングレースの定数

import type { Difficulty, GameSettings } from "./types";

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: "normal",
  timeLimit: 30,
};

export const TIME_OPTIONS = [15, 30, 60] as const;

export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; desc: string }
> = {
  easy: { label: "EASY", desc: "短い文章" },
  normal: { label: "NORMAL", desc: "標準的な文章" },
  hard: { label: "HARD", desc: "長い文章" },
};

export const STORAGE_KEY = "typerace_settings";
export const HIGHSCORE_KEY = "typerace_highscore";

// 文章リスト（難易度別）
export const SENTENCES: Record<Difficulty, string[]> = {
  easy: [
    "The cat sat on the mat.",
    "I like to eat apples.",
    "The sun is very bright.",
    "She runs fast every day.",
    "The dog barks at night.",
    "He reads books at home.",
    "The bird flies in the sky.",
    "We play games together.",
    "The fish swims in water.",
    "I drink tea every morning.",
    "The tree is very tall.",
    "She sings a nice song.",
    "The ball is round and red.",
    "He walks to school daily.",
    "The moon shines at night.",
  ],
  normal: [
    "Practice makes perfect in everything you do.",
    "The quick brown fox jumps over the lazy dog.",
    "A journey of a thousand miles begins with a single step.",
    "Time flies when you are having fun with friends.",
    "Learning to type faster takes patience and practice.",
    "The early bird catches the worm every morning.",
    "Actions speak louder than words in most cases.",
    "Every cloud has a silver lining in the end.",
    "Knowledge is power when used in the right way.",
    "The best things in life are often free and simple.",
    "Hard work always pays off in the long run.",
    "Never give up on your dreams and goals.",
    "Success comes to those who work hard daily.",
    "Reading books helps expand your vocabulary.",
    "Stay focused and never lose sight of your goals.",
  ],
  hard: [
    "Programming is the art of telling computers what to do in a language they understand.",
    "The greatest glory in living lies not in never falling, but in rising every time we fall.",
    "Technology is rapidly changing the way we communicate and interact with each other daily.",
    "Success is not the key to happiness, but happiness is the key to success in everything.",
    "The future belongs to those who believe in the beauty of their dreams and work hard.",
    "Continuous learning and adaptation are essential skills in our rapidly changing world today.",
    "Creativity is intelligence having fun, and imagination is more important than knowledge itself.",
    "The only way to do great work is to love what you do and never settle for less.",
    "Innovation distinguishes between a leader and a follower in every industry worldwide.",
    "Excellence is not a skill but an attitude that requires consistent effort every single day.",
  ],
};
