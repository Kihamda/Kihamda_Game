import type { DifficultyConfig } from "./types";

/** 難易度設定 */
export const DIFFICULTY: DifficultyConfig = {
  timePerRound: 10,
  initialLives: 3,
};

/** 出題パターン (含むべき文字列) */
export const PATTERNS: string[] = [
  "ea", "ou", "in", "an", "er", "th", "on", "re", "at", "en",
  "it", "or", "es", "ar", "al", "te", "st", "le", "nt", "ng",
  "oo", "ee", "ai", "ow", "ay", "ig", "ck", "un", "am", "op",
];

/** 検証用単語リスト (ハードコード) */
export const WORD_LIST: string[] = [
  // ea
  "beach", "dream", "great", "heart", "learn", "peace", "reach", "speak", "steam", "teach",
  "bread", "break", "cheap", "clean", "cream", "death", "feast", "heavy", "leave", "means",
  "please", "reason", "season", "stream", "sweater", "treasure", "weather", "meal", "seal", "deal",
  // ou
  "about", "cloud", "count", "found", "group", "house", "mouse", "round", "sound", "south",
  "touch", "would", "could", "should", "young", "country", "mountain", "outside", "through", "without",
  "hour", "four", "pour", "tour", "your", "court", "doubt", "mouth", "youth", "route",
  // in
  "begin", "drink", "final", "think", "print", "since", "thing", "winner", "bring", "finger",
  "inside", "kitchen", "morning", "nothing", "opinion", "painting", "raining", "sitting", "talking", "walking",
  "shine", "mine", "wine", "fine", "line", "pine", "nine", "dine", "vine", "spine",
  // an
  "animal", "banana", "began", "candy", "dance", "fancy", "giant", "hands", "plant", "stand",
  "change", "chance", "blanket", "planet", "manager", "manner", "panel", "angel", "anger", "range",
  "can", "man", "fan", "pan", "tan", "van", "ban", "plan", "clan", "span",
  // er
  "after", "better", "center", "danger", "energy", "finger", "hunger", "member", "number", "power",
  "river", "silver", "sister", "summer", "thunder", "together", "under", "water", "winter", "wonder",
  "her", "per", "ever", "never", "over", "super", "later", "layer", "paper", "tiger",
  // th
  "there", "their", "these", "those", "three", "throw", "thank", "thick",
  "other", "rather", "father", "mother", "brother", "anything", "something",
  "the", "they", "them", "then", "than", "that", "this", "with", "both", "path",
  // on
  "action", "control", "cotton", "front", "honey", "money", "month", "person",
  "button", "common", "dragon", "lesson", "melon", "prison", "question", "station", "weapon",
  "one", "only", "once", "long", "song", "wrong", "strong", "among", "belong",
  // re
  "agree", "area", "before", "create", "degree", "green", "increase", "prepare", "present",
  "rest", "read", "real", "ready", "recent", "record", "reduce", "region",
  "red", "free", "tree", "score", "store", "more", "core", "shore", "bore",
  // at
  "atom", "attack", "battle", "catch", "factory", "material", "matter", "match", "nature",
  "pattern", "platform", "scatter", "what", "cat", "bat",
  "hat", "sat", "fat", "rat", "flat", "chat", "boat", "coat", "goat", "meat",
  // en
  "end", "enjoy", "enter", "entire", "entry", "even", "event", "open", "often",
  "broken", "chosen", "fallen", "frozen", "golden", "hidden", "listen", "sudden", "taken", "wooden",
  "pen", "ten", "hen", "men", "den", "when", "been", "seen",
  // it
  "city", "exit", "fruit", "guitar", "habit", "item", "limit", "omit", "rabbit", "spirit",
  "unit", "visit", "white", "write", "admit", "digit", "edit", "permit", "submit", "transmit",
  "bit", "fit", "hit", "kit", "lit", "pit", "sit", "wit", "spit",
  // or
  "actor", "color", "doctor", "effort", "error", "factor", "favor", "floor", "forest", "forget",
  "horror", "major", "mirror", "motor", "order", "origin", "report", "short", "sport", "storm",
  "for", "nor", "corn", "horn", "born", "worn", "torn", "form", "word",
  // es
  "best", "chest", "dress", "fresh", "guest", "honest", "interest", "invest", "latest", "less",
  "message", "nest", "press", "quest", "suggest", "test", "vest", "west", "yes",
  "escape", "desk", "pest", "zest", "fest", "jest", "request", "protest", "contest",
  // ar
  "art", "arm", "army", "car", "card", "dark", "early", "earn", "earth", "far",
  "garden", "hard", "large", "market", "part", "party", "start", "star", "warm",
  "bar", "jar", "tar", "scar", "chart", "shark", "smart", "spark", "guard", "sugar",
  // al
  "all", "also", "always", "call", "fall", "global", "goal", "hall",
  "local", "mall", "metal", "moral", "normal", "small", "tall", "total", "wall",
  "balance", "palace", "salary", "value", "album", "alone", "along", "allow", "almost", "already",
  // te
  "center", "interest", "letter", "master",
  "system", "protect", "student", "western",
  "team", "tear", "tell", "temple", "tend", "term", "text", "mate", "gate",
  // st
  "cost", "east", "fast", "first", "last", "list", "lost", "most", "must",
  "past", "post", "trust", "worst", "stand", "state",
  "stay", "step", "still", "stock", "stone", "stop", "story", "study",
  // le
  "able", "apple", "bottle", "castle", "double", "example", "gentle", "little", "middle", "people",
  "purple", "puzzle", "simple", "single", "table", "title", "trouble", "uncle", "whole", "candle",
  "lead", "leaf", "lean", "leap", "legal", "lemon", "level",
  // nt
  "ant", "bent", "cent", "dent", "hint", "hunt", "mint", "paint",
  "point", "rent", "sent", "want", "went", "agent", "ancient", "content", "current",
  "different", "document", "element", "excellent", "experiment", "important", "instant", "internet", "moment",
  // ng
  "being", "doing", "during", "evening", "feeling", "going", "having", "king",
  "ring", "sing", "spring", "string",
  "wing", "tongue", "angle",
  // oo
  "book", "cool", "door", "food", "foot", "good", "look", "moon", "noon", "pool",
  "room", "root", "school", "soon", "tool", "wood", "wool", "bloom", "blood", "flood",
  "boot", "choose", "loose", "proof", "roof", "shoot", "smooth", "spoon", "stood", "tooth",
  // ee
  "bee", "beef", "beer", "deep", "deer", "feed", "feel", "feet",
  "keep", "meet", "need", "peek", "queen", "seed", "seek", "seem", "sheep",
  "sleep", "speed", "steel", "steep", "sweet", "teeth", "week", "wheel",
  // ai
  "aid", "aim", "air", "brain", "chain", "claim", "fair", "fail", "faith", "gain",
  "hair", "jail", "main", "mail", "maintain", "nail", "paid", "pain", "pair",
  "rail", "rain", "raise", "sail", "tail", "train", "wait", "afraid", "detail", "obtain",
  // ow
  "allow", "below", "blow", "borrow", "bow", "bowl", "brown", "cow", "crown", "down",
  "flow", "follow", "grow", "how", "know", "low", "now", "own", "row",
  "show", "slow", "snow", "tomorrow", "tower", "town", "window", "wow", "yellow",
  // ay
  "away", "bay", "birthday", "clay", "day", "delay", "display", "essay", "gray", "hay",
  "holiday", "lay", "okay", "pay", "play", "pray", "ray", "say", "spray",
  "subway", "today", "way", "maybe", "payment", "player", "mayor",
  // ig
  "big", "dig", "fig", "gig", "pig", "rig", "wig", "bright", "flight", "fight",
  "high", "light", "might", "night", "right", "sight", "sign", "slight", "tight", "digital",
  "figure", "ignore", "signal", "significant", "gigantic", "cigarette", "imagine", "magic",
  // ck
  "back", "black", "block", "brick", "check", "chick", "click", "clock", "cock", "crack",
  "deck", "dock", "duck", "kick", "knock", "lack", "lock", "luck", "neck", "pack",
  "pick", "pocket", "quick", "rack", "rock", "shock", "sick", "sock", "stack", "stick",
  // un
  "fun", "gun", "run", "sun", "bun", "nun", "pun", "stun", "spun", "begun",
  "understand", "until", "undo", "undone", "unless", "unlike", "unlock", "unusual",
  "bunch", "chunk", "drunk", "dunk", "funk", "hunk", "junk", "lunch", "punch", "trunk",
  // am
  "dam", "ham", "jam", "ram", "exam", "gram",
  "camera", "camp", "campus", "champion", "damage", "examine", "family", "famous", "game",
  "name", "same", "blame", "flame", "frame", "shame", "stamp", "trample", "sample",
  // op
  "cop", "hop", "mop", "pop", "top", "drop", "shop", "stop", "crop", "prop",
  "adopt", "chop", "operation", "opera", "oppose", "opposite", "optical",
  "popular", "population", "copper", "proper", "property", "prophet", "proposal", "tropical", "workshop", "develop",
];