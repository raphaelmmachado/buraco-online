import { type Card } from "../common/types/card";
import { type ScoreResult } from "../common/utils/scoring";
import { type GameRules } from "../common/types/rules";
import { type PlayerData, type GameMode, type TeamID, type PlayerID, type WinCondition } from "./types";
import * as fs from "fs";
import * as path from "path";

export interface ServerGameState {
  mode: GameMode;
  status: "LOBBY" | "PLAYING" | "ROUND_OVER" | "FINISHED";
  deck: Card[];
  discard_pile: Card[];
  dead_piles: Card[][];
  hands: Record<number, Card[]>;
  team_melds: Record<TeamID, Card[][]>;
  has_taken_dead_pile: [boolean, boolean];
  turn_phase: "DRAW" | "ACTION" | "DISCARD";
  current_player: number;
  players_connected: string[];
  players_data: Partial<Record<PlayerID, PlayerData>>;
  rules: GameRules;
  
  // Championship State
  win_condition?: WinCondition;
  cumulative_score: { team_1: number; team_2: number };
  round_count: number;
  rematch_votes?: Record<string, boolean>; // New: socketId -> wantsRematch

  turn_start_time?: number;
  last_drawn_card_id: string | null;
  cardsPlayedThisTurn?: number; // Added to match frontend expectations
  final_score: {
    team_1: number;
    team_2: number;
    details_t1: ScoreResult;
    details_t2: ScoreResult;
  } | null;
  disconnectTimeout?: NodeJS.Timeout | null;
}

// In-memory database
export let games: Record<string, ServerGameState> = {};

// Persistence Logic
const STORAGE_FILE = path.resolve(process.cwd(), "game_storage.json");

// Throttle save to prevent disk hammering
let saveTimeout: NodeJS.Timeout | null = null;

export const saveState = () => {
  if (saveTimeout) return;
  
  saveTimeout = setTimeout(() => {
    try {
      // Serialize games, excluding circular refs like Timeouts
      const serialized = JSON.stringify(games, (key, value) => {
        if (key === "disconnectTimeout") return undefined;
        return value;
      });
      
      fs.writeFile(STORAGE_FILE, serialized, "utf-8", (err) => {
        if (err) console.error("Failed to save game state:", err);
      });
      // console.log("💾 Game state saved to disk.");
    } catch (error) {
      console.error("Failed to save game state:", error);
    }
    saveTimeout = null;
  }, 1000); // Save at most once per second
};

export const loadState = () => {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, "utf-8");
      const loaded = JSON.parse(data);
      games = loaded;
      
      // Reset volatile state on load
      for (const roomId in games) {
        if (games[roomId]) {
            games[roomId].players_connected = [];
            games[roomId].disconnectTimeout = null;
        }
      }

      console.log(`📂 Loaded ${Object.keys(games).length} games from disk.`);
      
      // Clean up stale games or reset timeouts if needed?
      // For now, we just load them. Clients will try to reconnect.
    }
  } catch (error) {
    console.error("Failed to load game state:", error);
    // Start with empty state if load fails
    games = {};
  }
};