// スロットマシンのシンボル定義
export type Symbol = "🍒" | "🍋" | "🍊" | "🍇" | "🔔" | "⭐" | "7️⃣";

export interface Reel {
  symbols: Symbol[];
  currentIndex: number;
}

export interface SpinResult {
  symbols: [Symbol, Symbol, Symbol];
  isWin: boolean;
  isJackpot: boolean;
  multiplier: number;
  matchType: "none" | "pair" | "triple" | "jackpot";
}

export type GamePhase = "idle" | "spinning" | "stopping" | "result";
