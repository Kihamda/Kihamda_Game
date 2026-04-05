import type { Symbol, SpinResult } from "./types";
import { SYMBOLS, SYMBOL_WEIGHTS, PAYOUTS, PAIR_PAYOUT_MULTIPLIER } from "./constants";

// 重み付きランダムでシンボルを選択
export function getRandomSymbol(): Symbol {
  const totalWeight = Object.values(SYMBOL_WEIGHTS).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const symbol of SYMBOLS) {
    random -= SYMBOL_WEIGHTS[symbol];
    if (random <= 0) return symbol;
  }
  return SYMBOLS[0];
}

// リール用のシンボル配列を生成
export function generateReelSymbols(length: number): Symbol[] {
  return Array.from({ length }, () => getRandomSymbol());
}

// スピン結果を判定
export function evaluateSpinResult(symbols: [Symbol, Symbol, Symbol]): SpinResult {
  const [s1, s2, s3] = symbols;

  // ジャックポット（7が3つ）
  if (s1 === "7️⃣" && s2 === "7️⃣" && s3 === "7️⃣") {
    return {
      symbols,
      isWin: true,
      isJackpot: true,
      multiplier: PAYOUTS["7️⃣"],
      matchType: "jackpot",
    };
  }

  // 3つ揃い
  if (s1 === s2 && s2 === s3) {
    return {
      symbols,
      isWin: true,
      isJackpot: false,
      multiplier: PAYOUTS[s1],
      matchType: "triple",
    };
  }

  // 2つ揃い（先頭2つ or 後ろ2つ or 両端）
  if (s1 === s2 || s2 === s3 || s1 === s3) {
    const matchedSymbol = s1 === s2 ? s1 : s2 === s3 ? s2 : s1;
    return {
      symbols,
      isWin: true,
      isJackpot: false,
      multiplier: Math.floor(PAYOUTS[matchedSymbol] * PAIR_PAYOUT_MULTIPLIER),
      matchType: "pair",
    };
  }

  // ハズレ
  return {
    symbols,
    isWin: false,
    isJackpot: false,
    multiplier: 0,
    matchType: "none",
  };
}

// コイン獲得額計算
export function calculateWinnings(bet: number, multiplier: number): number {
  return bet * multiplier;
}
