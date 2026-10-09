export type Board = (string | null)[][];
export type GameMode = "classic" | "gravity";

export interface Player {
  name: string;
  mark: string;
  color: string;
}

export interface GameSettings {
  board: {
    width: number;
    height: number;
  };
  winLength: number;
  gameMode: GameMode;
  players: Player[];
}

export interface DevicePreferences {
  confirmationMode: boolean;
  lastGameSettings: GameSettings;
}

export interface PendingMove {
  row: number;
  col: number;
}

export interface PersistedState {
  appState: "before" | "in_progress" | "after";
  gameSettings: GameSettings;
  board: Board;
  currentPlayerIndex: number;
  winner: string | null;
}
